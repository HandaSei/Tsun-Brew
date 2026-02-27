let handler;

module.exports = async function (req, res) {
  if (!handler) {
    const mod = await import("../dist/vercel-handler.mjs");
    handler = mod.default;
  }
  return handler(req, res);
};
