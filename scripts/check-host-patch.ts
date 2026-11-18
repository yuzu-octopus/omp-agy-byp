// CLI-facing view of the shipped verifier. Extension source imports from src/patch-status:
// package `files` excludes scripts/, so a dependency on this path would break installs.
export {
  checkHostPatch,
  HOST_PATCH_ANCHORS,
  resolveHostFile,
  type HostPatchResult,
  type HostPatchStatus,
} from "../src/patch-status";
