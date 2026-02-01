import Server from "@/Core/Server"
import Socket from "@/Core/Socket"

import ServerHandlerModule from "@/Modules/ServerHandlerModule"

class Core {
	async boot () {
		try {
			await Server.boot()
			await Socket.boot(Server.http)
			ServerHandlerModule.onSocketStart()
		} catch (error) {
			console.error(error)
			process.exit(1)
		}
	}
}

export default new Core()
