import "dotenv/config"
import moduleAlias from "module-alias"

moduleAlias.addAlias("@", __dirname)

const Core = require("@/Core").default as { boot: () => Promise<void> | void }
Core.boot()
