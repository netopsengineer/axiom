const MESSAGE =
  "npm publication is disabled in axiom; use an explicit plugin release configuration.";

async function disabled() {
  throw new Error(MESSAGE);
}

export {
  disabled as addChannel,
  disabled as prepare,
  disabled as publish,
  disabled as verifyConditions,
};
