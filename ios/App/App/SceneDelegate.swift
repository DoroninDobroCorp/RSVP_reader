import UIKit
import Capacitor
import UniformTypeIdentifiers

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ReaderBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}


/// A document-only picker avoids WebKit's camera/photo choice while preserving
/// provider access for EPUB, FB2 and files with unknown document types.
class ReaderBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ReaderFilesPlugin())
    }
}

@objc(ReaderFilesPlugin)
public class ReaderFilesPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "ReaderFilesPlugin"
    public let jsName = "ReaderFiles"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pick", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise)
    ]
    private var pending: CAPPluginCall?
    private var importFiles: [String: URL] = [:]
    private let maxBytes = 100 * 1024 * 1024

    @objc func pick(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pending == nil else {
                call.reject("A document picker is already open.")
                return
            }
            guard let controller = self.bridge?.viewController else {
                call.reject("The document picker is unavailable.")
                return
            }
            self.pending = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.data], asCopy: true)
            picker.delegate = self
            picker.allowsMultipleSelection = false
            controller.present(picker, animated: true)
        }
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pending?.resolve(["cancelled": true])
        pending = nil
    }

    @objc func finish(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let token = call.getString("token"), let url = self.importFiles.removeValue(forKey: token) {
                try? FileManager.default.removeItem(at: url)
            }
            call.resolve()
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pending else { return }
        pending = nil
        guard let url = urls.first else { call.resolve(["cancelled": true]); return }
        let maxBytes = self.maxBytes
        DispatchQueue.global(qos: .userInitiated).async {
            let hasAccess = url.startAccessingSecurityScopedResource()
            defer { if hasAccess { url.stopAccessingSecurityScopedResource() } }
            var destination: URL?
            do {
                let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
                guard values.isRegularFile != false && (values.fileSize ?? 0) <= maxBytes else {
                    call.reject("This file is larger than the 100 MB import limit.")
                    return
                }
                let directory = FileManager.default.temporaryDirectory.appendingPathComponent("HummingReadImports", isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let token = UUID().uuidString
                let target = directory.appendingPathComponent(token)
                destination = target
                guard FileManager.default.createFile(atPath: target.path, contents: nil) else {
                    throw CocoaError(.fileWriteUnknown)
                }
                let input = try FileHandle(forReadingFrom: url)
                defer { try? input.close() }
                let output = try FileHandle(forWritingTo: target)
                defer { try? output.close() }
                var count = 0
                while let chunk = try input.read(upToCount: 1024 * 1024), !chunk.isEmpty {
                    count += chunk.count
                    guard count <= maxBytes else { throw CocoaError(.fileReadTooLarge) }
                    try output.write(contentsOf: chunk)
                }
                try output.synchronize()
                DispatchQueue.main.async {
                    self.importFiles[token] = target
                    call.resolve(["name": url.lastPathComponent, "url": target.absoluteString, "token": token])
                }
            } catch {
                if let destination { try? FileManager.default.removeItem(at: destination) }
                call.reject("Could not read the selected file.", nil, error)
            }
        }
    }
}
