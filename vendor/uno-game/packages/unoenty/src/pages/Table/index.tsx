import React, { useState } from "react"
import { Grid } from "@material-ui/core"
import { useParams, useHistory } from "react-router-dom"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { TouchBackend } from "react-dnd-touch-backend"

import { useSocketStore } from "@/store/Socket"

import useStyles from "@/pages/Table/styles"

import { dispatchEvent } from "@/services/event"

import useDidMount from "@/hooks/useDidMount"
import useSocket from "@/hooks/useSocket"

import {
	LoadingComponent,
	CloseGamePrompt,
} from "@/components"

import Device from "@/utils/device"

import CardStack from "@/pages/Table/CardStack"
import CardDeck from "@/pages/Table/CardDeck"
import CardDeckPlaceholder from "@/pages/Table/CardDeckPlaceholder"
import CustomCardDragPreview from "@/pages/Table/CustomCardDragPreview"
import TableChat from "@/pages/Table/TableChat"
import GameEndedModal from "@/pages/Table/GameEndedModal"

import CardProvider from "@/store/Card"

import { CardData, Game, PlayerWonEventData } from "@uno-game/protocols"
import SocketService from "@/services/socket"

const Table: React.FC = () => {
	const { gameId } = useParams<{ gameId: string }>()
	const history = useHistory()

	const socketStore = useSocketStore()
	const socket = useSocket()
	const classes = useStyles()

	const [loadingTable, setLoadingTable] = useState(true)

	const toggleRetry = () => {
		socket.toggleReady(gameId)
		socket.toggleOnlineStatus(gameId)
	}

	const openGameEndedModal = (
		winnerPlayerName: string,
		isCurrentPlayer: boolean,
		isWaitingForNewGame: boolean,
	) => {
		GameEndedModal.open({
			winnerPlayerName,
			isCurrentPlayer,
			isWaitingForNewGame,
			onPlayAgain: () => {
				toggleRetry()
			},
			onQuit: () => {
				window.location.href = "/"
			},
		})
	}

	const joinGame = async () => {
		const game = await socket.joinGame(gameId)

		const currentPlayer = socket.getCurrentPlayer(game.players)
		const winnerPlayer = socket.getWinner(game)

		const playerWinnerName = winnerPlayer?.name as string
		const isCurrentPlayer = winnerPlayer?.id === currentPlayer?.id

		if (game.status === "ended") {
			if (!currentPlayer || currentPlayer?.ready === true) {
				openGameEndedModal(
					playerWinnerName,
					isCurrentPlayer,
					true,
				)
			} else if (currentPlayer?.ready === false) {
				openGameEndedModal(
					playerWinnerName,
					isCurrentPlayer,
					false,
				)
			} else {
				history.push("/")
			}
		}

		setLoadingTable(false)
	}

	const onPlayerWon = () => {
		return SocketService.on<PlayerWonEventData>("PlayerWon", ({ player }) => {
			openGameEndedModal(
				player.name,
				player.id === socket?.currentPlayer?.id,
				false,
			)
		})
	}

	const onGameStart = () => {
		return socket.onGameStart(() => {
			/**
			 * Workaround to make sure the game is reloaded correctly after 'retry' since sometimes it
			 * happens to the global game state to be broken after interacting with 'LoadingScene' and 'GameEndedModal'.
			 */
			window.location.reload()
		})
	}

	const setupTable = async () => {
		dispatchEvent("GameTableOpened")

		await joinGame()
	}

	useDidMount(() => {
		const unsubscribePlayerWon = onPlayerWon()
		const unsubscribeGameStart = onGameStart()
		const unsubscribeReconnect = socket.onReconnect(() => joinGame())

		setupTable()

		return () => {
			unsubscribePlayerWon()
			unsubscribeGameStart()
			unsubscribeReconnect()
		}
	})

	return (
		<LoadingComponent loading={loadingTable}>
			<>
				<CloseGamePrompt />

				<TableChat />

				<CardProvider>
					<DndProvider
						backend={Device.isTouchDevice ? (
							TouchBackend
						) : (
							HTML5Backend
						)}
					>
						<Grid
							container
							className={classes.tableContainer}
						>
							<Grid
								container
								justifyContent="space-between"
								className={classes.topCardStackContainer}
							>
								<Grid
									item
									xs={2}
									className={classes.cardDeckPlaceholder}
								>
									<CardDeckPlaceholder
										position="topLeft"
										player={socket.layoutedOtherPlayers.topLeft}
									/>
								</Grid>
								<Grid
									item
									xs={8}
									className={classes.cardDeckPlaceholder}
								>
									<Grid container justifyContent="center" alignItems="center">
										<CardDeckPlaceholder
											position="top"
											player={socket.layoutedOtherPlayers.top}
										/>
									</Grid>
								</Grid>
								<Grid
									item
									xs={2}
									className={classes.cardDeckPlaceholder}
								>
									<CardDeckPlaceholder
										position="topRight"
										player={socket.layoutedOtherPlayers.topRight}
									/>
								</Grid>
							</Grid>
							<Grid
								container
								alignItems="flex-start"
								justifyContent="space-between"
							>
								<Grid
									item
									xs={2}
									className={classes.cardDeckPlaceholder}
								>
									<Grid container justifyContent="flex-start">
										<CardDeckPlaceholder
											position="left"
											player={socket.layoutedOtherPlayers.left}
										/>
									</Grid>
								</Grid>
								<Grid item xs={8}>
									<Grid container justifyContent="center" alignItems="center">
										<CardStack
											cards={socketStore?.game?.usedCards as CardData[]}
											game={socketStore.game as Game}
										/>
									</Grid>
								</Grid>
								<Grid
									item
									xs={2}
									className={classes.cardDeckPlaceholder}
								>
									<Grid container justifyContent="flex-end">
										<CardDeckPlaceholder
											position="right"
											player={socket.layoutedOtherPlayers.right}
										/>
									</Grid>
								</Grid>
							</Grid>
							<Grid container justifyContent="space-between">
								<Grid
									item
									xs={2}
									className={classes.cardDeckPlaceholder}
								>
									<CardDeckPlaceholder
										position="bottomLeft"
										player={socket.layoutedOtherPlayers.bottomLeft}
									/>
								</Grid>

								{socket?.currentPlayer ? (
									<Grid
										container
										alignItems="center"
										justifyContent="center"
										style={{ position: "absolute", bottom: 16, height: 240, left: 0 }}
									>
										<Grid
											style={{ height: "100%" }}
										>
											<CustomCardDragPreview />

											<CardDeck
												cards={socket.currentPlayer?.handCards}
												player={socket.currentPlayer}
											/>
										</Grid>
									</Grid>
								) : (
									<Grid
										item
										xs={2}
										className={classes.cardDeckPlaceholder}
									>
										<CardDeckPlaceholder
											position="bottom"
											player={socket.layoutedOtherPlayers.bottom}
										/>
									</Grid>
								)}

								<Grid
									item
									xs={2}
									className={classes.cardDeckPlaceholder}
								>
									<CardDeckPlaceholder
										position="bottomRight"
										player={socket.layoutedOtherPlayers.bottomRight}
									/>
								</Grid>
							</Grid>
						</Grid>
					</DndProvider>
				</CardProvider>
			</>
		</LoadingComponent>
	)
}

export default Table
