import DeviceActivity
import ExpoModulesCore
import SwiftUI
import UIKit

/*
 * La vue qui accueille le rapport d'Apple.
 *
 * Elle est transparente et ne recoit pas les touches : le rapport se lit, il
 * ne se manipule pas, et c'est l'ecran de l'app qui se voit derriere. Le
 * filtre demande les sept derniers jours en tranches quotidiennes — c'est
 * ce que la scene « overview » dessine barre par barre, et ce que la scene
 * « compare » moyenne.
 */
class ScreenTimeReportHostView: ExpoView {
  private var host: UIViewController?
  private var context = "compare"
  private var days = 7

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    clipsToBounds = true
    isUserInteractionEnabled = false
    rebuild()
  }

  func setContext(_ value: String) {
    guard value != context else { return }
    context = value
    rebuild()
  }

  func setDays(_ value: Int) {
    guard value != days else { return }
    days = max(1, min(30, value))
    rebuild()
  }

  private func rebuild() {
    host?.view.removeFromSuperview()
    host = nil

    guard #available(iOS 16.0, *) else { return }

    let cal = Calendar.current
    let end = Date()
    let start = cal.date(byAdding: .day, value: -days, to: cal.startOfDay(for: end)) ?? end
    let filter = DeviceActivityFilter(
      segment: .daily(during: DateInterval(start: start, end: end)),
      users: .all,
      devices: .all
    )
    let report = DeviceActivityReport(DeviceActivityReport.Context(context), filter: filter)
    let controller = UIHostingController(rootView: report)
    controller.view.backgroundColor = .clear
    addSubview(controller.view)
    host = controller
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    host?.view.frame = bounds
  }
}
