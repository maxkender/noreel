import SwiftUI

struct ContentView: View {
    @StateObject private var model = WebModel()

    var body: some View {
        ZStack(alignment: .top) {
            InstagramWebView(model: model)
                .ignoresSafeArea(edges: .bottom)

            if model.isLoading && model.progress < 1 {
                ProgressView(value: model.progress)
                    .progressViewStyle(.linear)
                    .tint(.pink)
            }

            if let message = model.errorMessage {
                ErrorView(message: message) { model.goHome() }
            }
        }
    }
}

private struct ErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 44))
                .foregroundStyle(.secondary)

            Text("Impossible de charger Instagram")
                .font(.headline)

            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button("Réessayer", action: retry)
                .buttonStyle(.borderedProminent)
                .tint(.pink)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.background)
    }
}
