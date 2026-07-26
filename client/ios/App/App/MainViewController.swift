import UIKit
import Capacitor
import WebKit

// Enables the iOS edge-swipe back/forward gesture. Capacitor's default bridge
// controller leaves WKWebView's `allowsBackForwardNavigationGestures` off, so
// there is nothing to swipe. The gesture walks the WKWebView session history,
// which mirrors React Router's pushState history, so a left-edge swipe goes
// back through the app's navigation.
class MainViewController: CAPBridgeViewController {
    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        let webView = super.webView(with: frame, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }
}
