const { execSync } = require('child_process')

/**
 * Re-sign the entire .app bundle with a consistent ad-hoc signature.
 * Required on macOS 13+ when building without an Apple Developer certificate,
 * because the bundled Electron Framework has Electron's Team ID while the
 * outer binary gets a blank Team ID — causing a DYLD Team ID mismatch crash.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
  console.log(`  • re-signing (ad-hoc deep): ${appPath}`)
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
}
