import crypto from "crypto"

class CryptUtil {
	private uuidV4 () {
		const bytes = crypto.randomBytes(16)

		bytes[6] = (bytes[6] & 0x0f) | 0x40
		bytes[8] = (bytes[8] & 0x3f) | 0x80

		const hex = bytes.toString("hex")

		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
	}

	makeShortUUID () {
		const uuidResult = this.uuidV4()

		const shortVersion = uuidResult.split("-").pop()

		return shortVersion
	}

	makeUUID () {
		const uuidResult = this.uuidV4()

		return uuidResult
	}
}

export default new CryptUtil()
