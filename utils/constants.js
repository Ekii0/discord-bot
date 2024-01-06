const { struct, u8 } = require("@solana/buffer-layout");
const { u64 } = require("@solana/buffer-layout-utils");

const dataLayout = struct([
  u8("instruction"),
  u8("nonce"),
  u64("openTime"),
  u64("pcAmount"),
  u64("coinAmount"),
]);

const SOL_MINT = "So11111111111111111111111111111111111111112";

module.exports = { dataLayout, SOL_MINT };
