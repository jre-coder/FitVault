const { withEntitlementsPlist, withXcodeProject, withDangerousMod } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

const APP_GROUP = 'group.com.elrcreative.fitvault'
const BUNDLE_ID = 'com.elrcreative.fitvault'
const EXT_BUNDLE_ID = `${BUNDLE_ID}.ShareExtension`
const BRIDGE_FILENAME = 'SharedDefaultsBridge.m'
const EXT_NAME = 'FitVaultShareExtension'

// ─── Main app: App Group entitlement ────────────────────────────────────────

function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    const existing = mod.modResults['com.apple.security.application-groups'] ?? []
    if (!existing.includes(APP_GROUP)) {
      mod.modResults['com.apple.security.application-groups'] = [...existing, APP_GROUP]
    }
    return mod
  })
}

// ─── Main app: SharedDefaultsBridge ObjC file ────────────────────────────────

function withBridgeFile(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const dir = path.join(mod.modRequest.platformProjectRoot, 'FitVault')
      fs.writeFileSync(path.join(dir, BRIDGE_FILENAME), bridgeSource(APP_GROUP))
      fs.writeFileSync(path.join(dir, 'SharedDefaultsBridge.h'), bridgeHeader())
      return mod
    },
  ])
}

function withBridgeInXcode(config) {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults
    const groups = project.hash.project.objects['PBXGroup'] ?? {}
    const refs = project.hash.project.objects['PBXFileReference'] ?? {}

    const alreadyAdded = Object.values(refs).some(
      (f) => typeof f === 'object' && (f.path === BRIDGE_FILENAME || f.path === `"${BRIDGE_FILENAME}"`)
    )
    if (alreadyAdded) return mod

    const groupKey = Object.keys(groups).find((key) => {
      const g = groups[key]
      return typeof g === 'object' && (g.name === 'FitVault' || g.path === 'FitVault')
    })

    if (groupKey) {
      project.addSourceFile(`FitVault/${BRIDGE_FILENAME}`, null, groupKey)
    }

    return mod
  })
}

// ─── Share Extension: Swift + Info.plist + entitlements files ────────────────

function withShareExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const extDir = path.join(mod.modRequest.platformProjectRoot, EXT_NAME)
      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir, { recursive: true })
      }
      fs.writeFileSync(path.join(extDir, 'ShareViewController.swift'), shareViewControllerSource())
      fs.writeFileSync(path.join(extDir, 'Info.plist'), shareExtInfoPlist())
      fs.writeFileSync(path.join(extDir, 'FitVaultShareExtension.entitlements'), shareExtEntitlements())
      return mod
    },
  ])
}

// ─── Share Extension: Xcode target ──────────────────────────────────────────

function withShareExtensionTarget(config) {
  return withXcodeProject(config, (mod) => {
    const xcodeProject = mod.modResults
    const objects = xcodeProject.hash.project.objects

    // Idempotency check
    const nativeTargets = objects['PBXNativeTarget'] ?? {}
    const alreadyAdded = Object.values(nativeTargets).some(
      (t) => typeof t === 'object' && (t.name === EXT_NAME || t.name === `"${EXT_NAME}"`)
    )
    if (alreadyAdded) return mod

    const gen = () => xcodeProject.generateUuid()

    // UUIDs
    const swiftRefUUID = gen()
    const plistRefUUID = gen()
    const appexRefUUID = gen()
    const extGroupUUID = gen()
    const swiftBfUUID = gen()
    const embedBfUUID = gen()
    const srcPhaseUUID = gen()
    const fwkPhaseUUID = gen()
    const resPhaseUUID = gen()
    const embedPhaseUUID = gen()
    const debugCfgUUID = gen()
    const releaseCfgUUID = gen()
    const cfgListUUID = gen()
    const extTargetUUID = gen()

    // File references
    objects['PBXFileReference'][swiftRefUUID] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'sourcecode.swift',
      path: 'ShareViewController.swift',
      sourceTree: '"<group>"',
    }
    objects['PBXFileReference'][`${swiftRefUUID}_comment`] = 'ShareViewController.swift'

    objects['PBXFileReference'][plistRefUUID] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.plist.xml',
      path: 'Info.plist',
      sourceTree: '"<group>"',
    }
    objects['PBXFileReference'][`${plistRefUUID}_comment`] = 'Info.plist'

    objects['PBXFileReference'][appexRefUUID] = {
      isa: 'PBXFileReference',
      explicitFileType: '"wrapper.app-extension"',
      includeInIndex: 0,
      path: `${EXT_NAME}.appex`,
      sourceTree: 'BUILT_PRODUCTS_DIR',
    }
    objects['PBXFileReference'][`${appexRefUUID}_comment`] = `${EXT_NAME}.appex`

    // Build files
    objects['PBXBuildFile'][swiftBfUUID] = {
      isa: 'PBXBuildFile',
      fileRef: swiftRefUUID,
    }
    objects['PBXBuildFile'][`${swiftBfUUID}_comment`] = 'ShareViewController.swift in Sources'

    objects['PBXBuildFile'][embedBfUUID] = {
      isa: 'PBXBuildFile',
      fileRef: appexRefUUID,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    }
    objects['PBXBuildFile'][`${embedBfUUID}_comment`] = `${EXT_NAME}.appex in Embed App Extensions`

    // Build phases for extension target
    objects['PBXSourcesBuildPhase'][srcPhaseUUID] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [{ value: swiftBfUUID, comment: 'ShareViewController.swift in Sources' }],
      runOnlyForDeploymentPostprocessing: 0,
    }
    objects['PBXSourcesBuildPhase'][`${srcPhaseUUID}_comment`] = 'Sources'

    objects['PBXFrameworksBuildPhase'][fwkPhaseUUID] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    }
    objects['PBXFrameworksBuildPhase'][`${fwkPhaseUUID}_comment`] = 'Frameworks'

    objects['PBXResourcesBuildPhase'][resPhaseUUID] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    }
    objects['PBXResourcesBuildPhase'][`${resPhaseUUID}_comment`] = 'Resources'

    // Extension group
    objects['PBXGroup'][extGroupUUID] = {
      isa: 'PBXGroup',
      children: [
        { value: swiftRefUUID, comment: 'ShareViewController.swift' },
        { value: plistRefUUID, comment: 'Info.plist' },
      ],
      path: EXT_NAME,
      sourceTree: '"<group>"',
    }
    objects['PBXGroup'][`${extGroupUUID}_comment`] = EXT_NAME

    // Add extension group to the project's main group
    const mainGroupUUID = '83CBB9F61A601CBA00E9B192'
    const mainGroup = objects['PBXGroup'][mainGroupUUID]
    if (mainGroup) {
      mainGroup.children.push({ value: extGroupUUID, comment: EXT_NAME })
    }

    // Add .appex product to the Products group
    const productsGroupUUID = Object.keys(objects['PBXGroup']).find((key) => {
      if (key.endsWith('_comment')) return false
      const g = objects['PBXGroup'][key]
      return typeof g === 'object' && g.name === 'Products'
    })
    if (productsGroupUUID) {
      objects['PBXGroup'][productsGroupUUID].children.push({
        value: appexRefUUID,
        comment: `${EXT_NAME}.appex`,
      })
    }

    // Build configurations
    const commonSettings = {
      CODE_SIGN_ENTITLEMENTS: `"${EXT_NAME}/FitVaultShareExtension.entitlements"`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: 1,
      INFOPLIST_FILE: `"${EXT_NAME}/Info.plist"`,
      IPHONEOS_DEPLOYMENT_TARGET: '15.1',
      MARKETING_VERSION: '1.0.0',
      PRODUCT_BUNDLE_IDENTIFIER: `"${EXT_BUNDLE_ID}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SKIP_INSTALL: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1,2"',
    }

    objects['XCBuildConfiguration'][debugCfgUUID] = {
      isa: 'XCBuildConfiguration',
      buildSettings: {
        ...commonSettings,
        DEBUG_INFORMATION_FORMAT: 'dwarf',
        SWIFT_ACTIVE_COMPILATION_CONDITIONS: 'DEBUG',
        SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
      },
      name: 'Debug',
    }
    objects['XCBuildConfiguration'][`${debugCfgUUID}_comment`] = 'Debug'

    objects['XCBuildConfiguration'][releaseCfgUUID] = {
      isa: 'XCBuildConfiguration',
      buildSettings: {
        ...commonSettings,
        COPY_PHASE_STRIP: 'NO',
        SWIFT_OPTIMIZATION_LEVEL: '"-Owholemodule"',
      },
      name: 'Release',
    }
    objects['XCBuildConfiguration'][`${releaseCfgUUID}_comment`] = 'Release'

    objects['XCConfigurationList'][cfgListUUID] = {
      isa: 'XCConfigurationList',
      buildConfigurations: [
        { value: debugCfgUUID, comment: 'Debug' },
        { value: releaseCfgUUID, comment: 'Release' },
      ],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: 'Release',
    }
    objects['XCConfigurationList'][`${cfgListUUID}_comment`] = `Build configuration list for PBXNativeTarget "${EXT_NAME}"`

    // Native target
    objects['PBXNativeTarget'][extTargetUUID] = {
      isa: 'PBXNativeTarget',
      buildConfigurationList: cfgListUUID,
      buildPhases: [
        { value: srcPhaseUUID, comment: 'Sources' },
        { value: fwkPhaseUUID, comment: 'Frameworks' },
        { value: resPhaseUUID, comment: 'Resources' },
      ],
      buildRules: [],
      dependencies: [],
      name: EXT_NAME,
      productName: EXT_NAME,
      productReference: appexRefUUID,
      productType: '"com.apple.product-type.app-extension"',
    }
    objects['PBXNativeTarget'][`${extTargetUUID}_comment`] = EXT_NAME

    // Add extension target to the project's targets array
    const rootObject = objects['PBXProject']['83CBB9F71A601CBA00E9B192']
    if (rootObject) {
      rootObject.targets.push({ value: extTargetUUID, comment: EXT_NAME })
    }

    // Add "Embed App Extensions" CopyFiles phase to the main FitVault target
    const mainTargetUUID = Object.keys(nativeTargets).find((key) => {
      if (key.endsWith('_comment')) return false
      const t = nativeTargets[key]
      return typeof t === 'object' && (t.name === 'FitVault' || t.name === '"FitVault"')
    })

    if (mainTargetUUID) {
      objects['PBXCopyFilesBuildPhase'] = objects['PBXCopyFilesBuildPhase'] || {}
      objects['PBXCopyFilesBuildPhase'][embedPhaseUUID] = {
        isa: 'PBXCopyFilesBuildPhase',
        buildActionMask: 2147483647,
        dstPath: '""',
        dstSubfolderSpec: 13,
        files: [{ value: embedBfUUID, comment: `${EXT_NAME}.appex in Embed App Extensions` }],
        name: '"Embed App Extensions"',
        runOnlyForDeploymentPostprocessing: 0,
      }
      objects['PBXCopyFilesBuildPhase'][`${embedPhaseUUID}_comment`] = 'Embed App Extensions'
      nativeTargets[mainTargetUUID].buildPhases.push({
        value: embedPhaseUUID,
        comment: 'Embed App Extensions',
      })
    }

    return mod
  })
}

// ─── Compose ─────────────────────────────────────────────────────────────────

module.exports = function withAppGroup(config) {
  config = withAppGroupEntitlement(config)
  config = withBridgeFile(config)
  config = withBridgeInXcode(config)
  config = withShareExtensionFiles(config)
  config = withShareExtensionTarget(config)
  return config
}

// ─── Source templates ────────────────────────────────────────────────────────

function bridgeHeader() {
  return `#import <React/RCTBridgeModule.h>

@interface SharedDefaultsBridge : NSObject <RCTBridgeModule>
@end
`
}

function bridgeSource(appGroup) {
  return `// Bridges App Group UserDefaults to React Native for the Share Extension pending queue.
#import "SharedDefaultsBridge.h"

static NSString *const kAppGroup = @"${appGroup}";
static NSString *const kPendingKey = @"pendingShareItems";

@implementation SharedDefaultsBridge

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(readPendingItems:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *ud = [[NSUserDefaults alloc] initWithSuiteName:kAppGroup];
  resolve([ud stringForKey:kPendingKey] ?: @"[]");
}

RCT_EXPORT_METHOD(clearPendingItems:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *ud = [[NSUserDefaults alloc] initWithSuiteName:kAppGroup];
  [ud removeObjectForKey:kPendingKey];
  [ud synchronize];
  resolve(nil);
}

@end
`
}

function shareViewControllerSource() {
  return `import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    private let appGroup = "${APP_GROUP}"
    private let pendingKey = "pendingShareItems"

    private let bodyParts = [
        "Full Body", "Chest", "Back", "Shoulders", "Arms",
        "Core", "Legs", "Glutes", "Cardio", "Mobility",
    ]

    private var sharedURL = ""
    private var detectedPlatform = "website"
    private var selectedBodyPart = "Full Body"
    private var isURLLoaded = false

    private var titleField: UITextField!
    private var notesView: UITextView!
    private var notesPlaceholder: UILabel!
    private var platformBadge: UILabel!
    private var saveButton: UIButton!
    private var chipButtons: [UIButton] = []
    private var autoDismissWorkItem: DispatchWorkItem?

    // MARK: Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        buildUI()
        extractURL()
    }

    // MARK: URL extraction

    private func extractURL() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let provider = item.attachments?.first else { return }

        let urlType: String
        let textType: String
        if #available(iOS 14, *) {
            urlType = UTType.url.identifier
            textType = UTType.plainText.identifier
        } else {
            urlType = kUTTypeURL as String
            textType = kUTTypePlainText as String
        }

        if provider.hasItemConformingToTypeIdentifier(urlType) {
            provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] item, _ in
                let str: String
                if let url = item as? URL { str = url.absoluteString }
                else if let s = item as? String { str = s }
                else { return }
                DispatchQueue.main.async { self?.populate(url: str) }
            }
        } else if provider.hasItemConformingToTypeIdentifier(textType) {
            provider.loadItem(forTypeIdentifier: textType, options: nil) { [weak self] item, _ in
                guard let str = item as? String else { return }
                DispatchQueue.main.async { self?.populate(url: str) }
            }
        }
    }

    private func populate(url: String) {
        sharedURL = url
        isURLLoaded = true
        detectedPlatform = detectPlatform(url)
        platformBadge.text = badgeText(detectedPlatform)
        platformBadge.backgroundColor = badgeColor(detectedPlatform)
        if titleField.text?.isEmpty ?? true {
            titleField.text = defaultTitle(url)
        }
        saveButton.isEnabled = true
        saveButton.alpha = 1.0
    }

    private func detectPlatform(_ url: String) -> String {
        let l = url.lowercased()
        if l.contains("youtube.com") || l.contains("youtu.be") { return "youtube" }
        if l.contains("instagram.com") { return "instagram" }
        if l.contains("tiktok.com") { return "tiktok" }
        return "website"
    }

    private func defaultTitle(_ url: String) -> String {
        guard let host = URL(string: url)?.host else { return "Workout" }
        if host.contains("youtube") { return "YouTube Workout" }
        if host.contains("instagram") { return "Instagram Workout" }
        if host.contains("tiktok") { return "TikTok Workout" }
        return host.replacingOccurrences(of: "www.", with: "").capitalized + " Workout"
    }

    private func badgeText(_ platform: String) -> String {
        switch platform {
        case "youtube": return "YouTube"
        case "instagram": return "Instagram"
        case "tiktok": return "TikTok"
        default: return "Website"
        }
    }

    private func badgeColor(_ platform: String) -> UIColor {
        switch platform {
        case "youtube": return .systemRed
        case "instagram": return UIColor(red: 0.53, green: 0.11, blue: 0.69, alpha: 1)
        case "tiktok": return UIColor(red: 0.0, green: 0.78, blue: 0.71, alpha: 1)
        default: return .systemBlue
        }
    }

    // MARK: Save / Cancel

    @objc private func saveTapped() {
        let title = titleField.text?.trimmingCharacters(in: .whitespaces) ?? ""
        guard !title.isEmpty else { shake(titleField); return }

        let item: [String: Any] = [
            "id": UUID().uuidString,
            "url": sharedURL,
            "title": title,
            "notes": notesView.text ?? "",
            "bodyParts": [selectedBodyPart],
            "sourceType": detectedPlatform,
            "savedAt": ISO8601DateFormatter().string(from: Date()),
        ]

        let defaults = UserDefaults(suiteName: appGroup)!
        var queue: [[String: Any]] = []
        if let s = defaults.string(forKey: pendingKey),
           let d = s.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: d) as? [[String: Any]] {
            queue = parsed
        }
        queue.append(item)
        if let d = try? JSONSerialization.data(withJSONObject: queue),
           let s = String(data: d, encoding: .utf8) {
            defaults.set(s, forKey: pendingKey)
            defaults.synchronize()
        }

        showSuccessAndDismiss()
    }

    private func showSuccessAndDismiss() {
        let overlay = UIView()
        overlay.backgroundColor = UIColor.systemBackground.withAlphaComponent(0.95)
        overlay.layer.cornerRadius = 16
        overlay.translatesAutoresizingMaskIntoConstraints = false

        let icon = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
        icon.tintColor = .systemGreen
        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false

        let label = UILabel()
        label.text = "Saved to FitVault"
        label.font = .systemFont(ofSize: 17, weight: .semibold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false

        let openBtn = UIButton(type: .system)
        openBtn.setTitle("Open FitVault", for: .normal)
        openBtn.titleLabel?.font = .systemFont(ofSize: 15, weight: .medium)
        openBtn.addTarget(self, action: #selector(openFitVaultTapped), for: .touchUpInside)
        openBtn.translatesAutoresizingMaskIntoConstraints = false

        overlay.addSubview(icon)
        overlay.addSubview(label)
        overlay.addSubview(openBtn)
        view.addSubview(overlay)

        NSLayoutConstraint.activate([
            overlay.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            overlay.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            overlay.widthAnchor.constraint(equalToConstant: 220),
            overlay.heightAnchor.constraint(equalToConstant: 150),
            icon.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            icon.topAnchor.constraint(equalTo: overlay.topAnchor, constant: 24),
            icon.widthAnchor.constraint(equalToConstant: 40),
            icon.heightAnchor.constraint(equalToConstant: 40),
            label.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 10),
            label.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            openBtn.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 12),
            openBtn.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
        ])

        overlay.alpha = 0
        UIView.animate(withDuration: 0.2) { overlay.alpha = 1 }

        autoDismissWorkItem = DispatchWorkItem { [weak self] in
            UIView.animate(withDuration: 0.2, animations: { overlay.alpha = 0 }) { _ in
                self?.extensionContext?.completeRequest(returningItems: nil)
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0, execute: autoDismissWorkItem!)
    }

    @objc private func openFitVaultTapped() {
        autoDismissWorkItem?.cancel()
        guard let url = URL(string: "fitvault://") else {
            extensionContext?.completeRequest(returningItems: nil)
            return
        }
        // Calling completeRequest alongside open can race/cancel the URL open.
        // Passing nil lets the system dismiss the extension after opening the app.
        extensionContext?.open(url, completionHandler: nil)
    }

    @objc private func cancelTapped() {
        extensionContext?.cancelRequest(
            withError: NSError(domain: Bundle.main.bundleIdentifier ?? "FitVaultShareExtension", code: 0)
        )
    }

    // MARK: Chip selection

    @objc private func chipTapped(_ sender: UIButton) {
        selectedBodyPart = bodyParts[sender.tag]
        chipButtons.forEach { $0.setNeedsUpdateConfiguration() }
    }

    // MARK: Notes placeholder

    @objc private func notesChanged() {
        notesPlaceholder.isHidden = !notesView.text.isEmpty
    }

    // MARK: Shake animation

    private func shake(_ view: UIView) {
        let anim = CAKeyframeAnimation(keyPath: "transform.translation.x")
        anim.timingFunction = CAMediaTimingFunction(name: .linear)
        anim.duration = 0.4
        anim.values = [-8, 8, -6, 6, -4, 4, 0]
        view.layer.add(anim, forKey: "shake")
    }

    // MARK: UI construction

    private func buildUI() {
        // Header bar
        let header = UIView()
        header.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(header)

        let cancelBtn = makeTextButton("Cancel", action: #selector(cancelTapped))
        header.addSubview(cancelBtn)

        let navTitle = UILabel()
        navTitle.text = "Save to FitVault"
        navTitle.font = .systemFont(ofSize: 17, weight: .semibold)
        navTitle.translatesAutoresizingMaskIntoConstraints = false
        header.addSubview(navTitle)

        let saveBtn = makeTextButton("Save", action: #selector(saveTapped))
        saveBtn.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        saveBtn.isEnabled = false
        saveBtn.alpha = 0.4
        saveButton = saveBtn
        header.addSubview(saveBtn)

        // Separator
        let sep = UIView()
        sep.backgroundColor = .separator
        sep.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(sep)

        // Scroll + content
        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)

        let content = UIView()
        content.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(content)

        // Platform badge
        platformBadge = UILabel()
        platformBadge.text = "Website"
        platformBadge.textColor = .white
        platformBadge.font = .systemFont(ofSize: 12, weight: .semibold)
        platformBadge.textAlignment = .center
        platformBadge.backgroundColor = .systemBlue
        platformBadge.layer.cornerRadius = 10
        platformBadge.clipsToBounds = true
        platformBadge.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(platformBadge)

        // Title
        let titleLbl = makeSectionLabel("Title")
        content.addSubview(titleLbl)

        titleField = UITextField()
        titleField.placeholder = "Workout title"
        titleField.borderStyle = .roundedRect
        titleField.font = .systemFont(ofSize: 16)
        titleField.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(titleField)

        // Notes
        let notesLbl = makeSectionLabel("Notes (optional)")
        content.addSubview(notesLbl)

        notesView = UITextView()
        notesView.font = .systemFont(ofSize: 16)
        notesView.layer.cornerRadius = 8
        notesView.layer.borderWidth = 0.5
        notesView.layer.borderColor = UIColor.separator.cgColor
        notesView.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(notesView)

        notesPlaceholder = UILabel()
        notesPlaceholder.text = "Add notes about this workout…"
        notesPlaceholder.font = .systemFont(ofSize: 16)
        notesPlaceholder.textColor = .placeholderText
        notesPlaceholder.translatesAutoresizingMaskIntoConstraints = false
        notesView.addSubview(notesPlaceholder)
        NotificationCenter.default.addObserver(
            self, selector: #selector(notesChanged),
            name: UITextView.textDidChangeNotification, object: notesView
        )

        // Category chips
        let catLbl = makeSectionLabel("Category")
        content.addSubview(catLbl)

        let chips = buildChips()
        content.addSubview(chips)

        // Constraints
        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            header.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            header.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            header.heightAnchor.constraint(equalToConstant: 52),

            cancelBtn.leadingAnchor.constraint(equalTo: header.leadingAnchor, constant: 16),
            cancelBtn.centerYAnchor.constraint(equalTo: header.centerYAnchor),

            navTitle.centerXAnchor.constraint(equalTo: header.centerXAnchor),
            navTitle.centerYAnchor.constraint(equalTo: header.centerYAnchor),

            saveBtn.trailingAnchor.constraint(equalTo: header.trailingAnchor, constant: -16),
            saveBtn.centerYAnchor.constraint(equalTo: header.centerYAnchor),

            sep.topAnchor.constraint(equalTo: header.bottomAnchor),
            sep.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            sep.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            sep.heightAnchor.constraint(equalToConstant: 0.5),

            scroll.topAnchor.constraint(equalTo: sep.bottomAnchor),
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),

            content.topAnchor.constraint(equalTo: scroll.topAnchor),
            content.leadingAnchor.constraint(equalTo: scroll.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: scroll.trailingAnchor),
            content.bottomAnchor.constraint(equalTo: scroll.bottomAnchor),
            content.widthAnchor.constraint(equalTo: scroll.widthAnchor),

            platformBadge.topAnchor.constraint(equalTo: content.topAnchor, constant: 20),
            platformBadge.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 16),
            platformBadge.heightAnchor.constraint(equalToConstant: 24),
            platformBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 80),

            titleLbl.topAnchor.constraint(equalTo: platformBadge.bottomAnchor, constant: 20),
            titleLbl.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 16),

            titleField.topAnchor.constraint(equalTo: titleLbl.bottomAnchor, constant: 6),
            titleField.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 16),
            titleField.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -16),
            titleField.heightAnchor.constraint(equalToConstant: 44),

            notesLbl.topAnchor.constraint(equalTo: titleField.bottomAnchor, constant: 20),
            notesLbl.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 16),

            notesView.topAnchor.constraint(equalTo: notesLbl.bottomAnchor, constant: 6),
            notesView.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 16),
            notesView.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -16),
            notesView.heightAnchor.constraint(equalToConstant: 88),

            notesPlaceholder.topAnchor.constraint(equalTo: notesView.topAnchor, constant: 8),
            notesPlaceholder.leadingAnchor.constraint(equalTo: notesView.leadingAnchor, constant: 5),

            catLbl.topAnchor.constraint(equalTo: notesView.bottomAnchor, constant: 20),
            catLbl.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 16),

            chips.topAnchor.constraint(equalTo: catLbl.bottomAnchor, constant: 10),
            chips.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 16),
            chips.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -16),
            chips.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -32),
        ])
    }

    private func makeSectionLabel(_ text: String) -> UILabel {
        let l = UILabel()
        l.text = text
        l.font = .systemFont(ofSize: 13, weight: .medium)
        l.textColor = .secondaryLabel
        l.translatesAutoresizingMaskIntoConstraints = false
        return l
    }

    private func makeTextButton(_ title: String, action: Selector) -> UIButton {
        let btn = UIButton(type: .system)
        btn.setTitle(title, for: .normal)
        btn.addTarget(self, action: action, for: .touchUpInside)
        btn.translatesAutoresizingMaskIntoConstraints = false
        return btn
    }

    private func buildChips() -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false

        let screenWidth = UIScreen.main.bounds.width - 32
        var x: CGFloat = 0
        var y: CGFloat = 0
        let chipH: CGFloat = 34
        let hGap: CGFloat = 8
        let vGap: CGFloat = 8

        for (i, name) in bodyParts.enumerated() {
            var cfg = UIButton.Configuration.filled()
            cfg.title = name
            cfg.baseForegroundColor = .label
            cfg.baseBackgroundColor = .secondarySystemBackground
            cfg.cornerStyle = .capsule
            cfg.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: 14, bottom: 0, trailing: 14)
            cfg.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attrs in
                var a = attrs
                a.font = UIFont.systemFont(ofSize: 14, weight: .medium)
                return a
            }

            let btn = UIButton(configuration: cfg)
            btn.tag = i
            btn.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)

            btn.configurationUpdateHandler = { [weak self] button in
                guard let self = self else { return }
                var c = button.configuration ?? cfg
                let selected = self.bodyParts[button.tag] == self.selectedBodyPart
                c.baseBackgroundColor = selected ? .systemBlue : .secondarySystemBackground
                c.baseForegroundColor = selected ? .white : .label
                button.configuration = c
            }

            let chipW = name.size(withAttributes: [.font: UIFont.systemFont(ofSize: 14, weight: .medium)]).width + 28
            if x + chipW > screenWidth && x > 0 { x = 0; y += chipH + vGap }
            btn.frame = CGRect(x: x, y: y, width: chipW, height: chipH)
            container.addSubview(btn)
            chipButtons.append(btn)
            x += chipW + hGap
        }

        container.heightAnchor.constraint(equalToConstant: y + chipH).isActive = true
        return container
    }
}
`
}

function shareExtInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>FitVault</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionAttributes</key>
    <dict>
      <key>NSExtensionActivationRule</key>
      <dict>
        <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
        <integer>1</integer>
        <key>NSExtensionActivationSupportsWebPageWithMaxCount</key>
        <integer>1</integer>
        <key>NSExtensionActivationSupportsText</key>
        <true/>
      </dict>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.share-services</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
  </dict>
</dict>
</plist>
`
}

function shareExtEntitlements() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>
`
}
