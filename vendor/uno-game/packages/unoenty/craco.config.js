const path = require("path")

module.exports = {
  webpack: {
    alias: {
			"@": path.resolve(__dirname, "src")
    },
    configure: (webpackConfig) => {
      const appRoot = path.resolve(__dirname, "..", "..", "..", "..")
      const rootTypescriptPath = path.join(appRoot, "node_modules", "typescript")
      if (Array.isArray(webpackConfig.plugins)) {
        for (const plugin of webpackConfig.plugins) {
          const name = plugin && plugin.constructor ? plugin.constructor.name : ""
          const opts = plugin && plugin.options ? plugin.options : null

          if (name.includes("ForkTsChecker") || (opts && (opts.typescriptPath || opts.typescript))) {
            if (opts) {
              opts.typescriptPath = rootTypescriptPath
              if (opts.typescript && typeof opts.typescript === "object") {
                opts.typescript.typescriptPath = rootTypescriptPath
              }
            }
          }
        }
      }
      return webpackConfig
    },
  }
}
