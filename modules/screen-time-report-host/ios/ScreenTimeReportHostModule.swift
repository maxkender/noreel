import ExpoModulesCore

/*
 * Le module hote : une vue, deux proprietes.
 *
 * Il ne SAIT rien du temps d'ecran. Il pose la vue d'Apple a l'endroit que
 * React Native lui indique, avec le contexte demande (« compare » ou
 * « overview ») et la fenetre de jours ; l'extension ScreenTimeReport fait
 * le reste, de son cote de la cloison.
 */
public class ScreenTimeReportHostModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScreenTimeReportHost")

    // DeviceActivityReport n'existe qu'a partir d'iOS 16 : en dessous, l'app
    // doit le savoir avant de reserver de la place a l'ecran.
    Function("isSupported") { () -> Bool in
      if #available(iOS 16.0, *) { return true }
      return false
    }

    View(ScreenTimeReportHostView.self) {
      Prop("context") { (view: ScreenTimeReportHostView, value: String) in
        view.setContext(value)
      }
      Prop("days") { (view: ScreenTimeReportHostView, value: Int?) in
        view.setDays(value ?? 7)
      }
    }
  }
}
