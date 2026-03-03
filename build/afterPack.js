const { execSync } = require('child_process')
const path = require('path')

/**
 * Ad-hoc sign every binary in the .app bundle from inside out.
 *
 * IMPORTANT: This runs as `afterSign` (not afterPack) so it executes AFTER
 * electron-builder's own signing pass, guaranteeing our signatures are final.
 *
 * macOS 15+ (Sequoia) and 16 (Tahoe) strictly require all binaries loaded into
 * a process to share the same Team ID. electron-builder's built-in signing pass
 * re-signs only the top-level .app, leaving Electron Framework with its original
 * Electron team ID while the main executable gets an ad-hoc (no team) signature.
 * We fix this by re-signing everything bottom-up so all binaries end up with the
 * same ad-hoc (empty) team identifier.
 */
exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
  const framesDir = `${appPath}/Contents/Frameworks`
  const entitlements = path.join(__dirname, 'entitlements.mac.plist')

  const run = (cmd) => execSync(cmd, { stdio: 'inherit' })

  // Base flags — force-replace any existing signature, ad-hoc identity, no timestamp
  const base = `--force --sign - --timestamp=none`
  // For binaries that need entitlements (JIT / V8 / helpers / main app)
  const withEnt = `${base} --entitlements "${entitlements}"`
  // For libraries where we just want to carry forward whatever entitlements existed
  const withMeta = `${base} --preserve-metadata=entitlements`

  console.log(`  • ad-hoc re-signing (bottom-up): ${appPath}`)

  // 1. Native libraries (.dylib / .so / .node) — carry forward existing entitlements
  run(`find "${appPath}" \\( -name "*.dylib" -o -name "*.so" -o -name "*.node" \\) -exec codesign ${withMeta} {} \\;`)

  // 2. Electron Framework — sign the BINARY directly first, then seal the bundle.
  //    This is the critical step: codesign on the bundle alone does not always
  //    replace the team ID embedded in the versioned binary on macOS 26.
  run(`codesign ${withEnt} "${framesDir}/Electron Framework.framework/Versions/A/Electron Framework"`)
  run(`codesign ${withEnt} "${framesDir}/Electron Framework.framework"`)

  // 3. Helper .app bundles inside Frameworks (sign after the framework they link)
  run(`find "${framesDir}" -maxdepth 3 -name "*.app" -exec codesign ${withEnt} {} \\;`)

  // 4. Any other frameworks (Squirrel, Mantle, ReactiveObjC …)
  run(`find "${framesDir}" -maxdepth 1 -name "*.framework" ! -name "Electron Framework.framework" -exec codesign ${withMeta} {} \\;`)

  // 5. Main app bundle — signed last so the bundle seal covers everything above
  run(`codesign ${withEnt} "${appPath}"`)

  // Verify the result so build fails loudly if something went wrong
  console.log(`  • verifying signature…`)
  run(`codesign --verify --deep --strict "${appPath}"`)

  console.log(`  • re-signing complete`)
}
