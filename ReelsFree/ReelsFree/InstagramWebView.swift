import SwiftUI
import WebKit

/// État de la webview exposé à SwiftUI (barre de progression, erreurs).
@MainActor
final class WebModel: ObservableObject {
    @Published var progress: Double = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    fileprivate weak var webView: WKWebView?

    static let home = URL(string: "https://www.instagram.com/")!

    func reload() {
        errorMessage = nil
        if let webView, webView.url != nil {
            webView.reload()
        } else {
            webView?.load(URLRequest(url: Self.home))
        }
    }

    func goHome() {
        errorMessage = nil
        webView?.load(URLRequest(url: Self.home))
    }
}

struct InstagramWebView: UIViewRepresentable {
    @ObservedObject var model: WebModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.addUserScript(
            WKUserScript(source: ReelsBlocker.script,
                         injectionTime: .atDocumentStart,
                         forMainFrameOnly: true)
        )

        let config = WKWebViewConfiguration()
        config.userContentController = controller
        // .default() = store persistant : la session Instagram survit au
        // redémarrage de l'app. Avec .nonPersistent() il faudrait se
        // reconnecter à chaque lancement.
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true

        let web = WKWebView(frame: .zero, configuration: config)

        // Sans un UA de vrai Safari mobile, Instagram sert une page dégradée
        // avec un bandeau "ouvrir dans l'app" permanent.
        web.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
            + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

        web.allowsBackForwardNavigationGestures = true
        web.navigationDelegate = context.coordinator

        // Tirer vers le bas pour rafraîchir.
        let refresh = UIRefreshControl()
        refresh.addTarget(context.coordinator,
                          action: #selector(Coordinator.handleRefresh(_:)),
                          for: .valueChanged)
        web.scrollView.refreshControl = refresh

        context.coordinator.observe(web)
        model.webView = web

        web.load(URLRequest(url: WebModel.home))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        let model: WebModel
        private var observations: [NSKeyValueObservation] = []

        init(model: WebModel) { self.model = model }

        func observe(_ web: WKWebView) {
            observations = [
                web.observe(\.estimatedProgress, options: [.new]) { [weak self] web, _ in
                    Task { @MainActor in self?.model.progress = web.estimatedProgress }
                },
                web.observe(\.isLoading, options: [.new]) { [weak self] web, _ in
                    Task { @MainActor in self?.model.isLoading = web.isLoading }
                },
            ]
        }

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            model.reload()
            sender.endRefreshing()
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

            guard let url = navigationAction.request.url else {
                decisionHandler(.allow); return
            }

            let host = url.host ?? ""
            let isInstagram = host == "instagram.com" || host.hasSuffix(".instagram.com")

            if isInstagram {
                // Blocage natif, en complément du JS.
                if ReelsBlocker.isReelPath(url.path) {
                    decisionHandler(.cancel)
                    webView.load(URLRequest(url: WebModel.home))
                    return
                }
                decisionHandler(.allow)
                return
            }

            // Un lien externe tapé par l'utilisateur part dans Safari plutôt
            // que de le piéger dans la webview. Les redirections automatiques
            // (ex. facebook.com pendant le login) restent autorisées ici.
            if navigationAction.navigationType == .linkActivated,
               url.scheme == "http" || url.scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView,
                     didFailProvisionalNavigation navigation: WKNavigation!,
                     withError error: Error) {
            report(error)
        }

        func webView(_ webView: WKWebView,
                     didFail navigation: WKNavigation!,
                     withError error: Error) {
            report(error)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            Task { @MainActor in self.model.errorMessage = nil }
        }

        private func report(_ error: Error) {
            let ns = error as NSError
            // -999 = navigation annulée (notre propre redirection), pas une erreur.
            guard ns.code != NSURLErrorCancelled else { return }
            Task { @MainActor in self.model.errorMessage = ns.localizedDescription }
        }
    }
}
