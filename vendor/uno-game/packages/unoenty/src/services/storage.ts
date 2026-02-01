import ErrorHandler from "@uno-game/error-handler"

class Storage {
	get<Data extends Record<string, unknown>> (key: string): Data | null {
		try {
			const stringifiedData = localStorage.getItem(key)

			if (stringifiedData) {
				const parsedData = JSON.parse(stringifiedData)

				return parsedData
			} else {
				return null
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			ErrorHandler.handle(err)
			return null
		}
	}

	set (key: string, data: Record<string, unknown>) {
		try {
			const stringifiedData = JSON.stringify(data)

			localStorage.setItem(key, stringifiedData)
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			ErrorHandler.handle(err)
		}
	}

	delete (key: string) {
		try {
			localStorage.removeItem(key)
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			ErrorHandler.handle(err)
		}
	}
}

export default new Storage()
