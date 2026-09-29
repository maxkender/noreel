import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings
import SwiftUI

/*
 * Le rapport Temps d'ecran : le seul endroit ou le VRAI chiffre existe.
 *
 * Apple ne donne le temps d'ecran a aucune app. Il fournit une extension,
 * isolee — sans reseau, sans droit d'ecrire — qui recoit les chiffres et
 * qui les DESSINE. L'app hote affiche la vue, et ne saura jamais ce qu'elle
 * contient. C'est une regle de confidentialite, pas une limite technique.
 *
 * Donc tout ce qui doit tenir compte du vrai chiffre se dessine ICI :
 * la comparaison avec l'estimation, la moyenne, les prises en main, les
 * apps qui prennent le plus. L'app envoie ce qu'elle sait — l'estimation,
 * les textes dans la bonne langue, les couleurs du theme — par le groupe
 * partage, que cette extension a le droit de LIRE.
 */

private let group = "group.com.vikstudios.noreel"
private let defaults = UserDefaults(suiteName: group)

@main
struct ScreenTimeReport: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    CompareScene { CompareView(m: $0) }
    OverviewScene { OverviewView(m: $0) }
    ShareScene { ShareView(m: $0) }
    YearsScene { YearsView(m: $0) }
  }
}

// MARK: - Ce que l'app nous passe

struct Theme {
  let strings: [String: String]
  let accent: Color
  let danger: Color
  let good: Color
  let ink: Color
  let inkSoft: Color

  static func load() -> Theme {
    let s = (defaults?.dictionary(forKey: "unswipe.report.strings") as? [String: String]) ?? [:]
    let c = (defaults?.dictionary(forKey: "unswipe.report.colors") as? [String: String]) ?? [:]
    return Theme(
      strings: s,
      accent: Color(hex: c["accent"] ?? "#8B7CFF"),
      danger: Color(hex: c["danger"] ?? "#FF5A5F"),
      good: Color(hex: c["good"] ?? "#2E9E5B"),
      ink: Color(hex: c["ink"] ?? "#F4F7FF"),
      inkSoft: Color(hex: c["inkSoft"] ?? "#9AA6C2")
    )
  }

  /// Le texte, avec ses trous remplis. La cle elle-meme si elle manque :
  /// on prefere lire « lessTitle » qu'un ecran vide.
  func t(_ key: String, _ vars: [String: String] = [:]) -> String {
    var out = strings[key] ?? key
    for (k, v) in vars { out = out.replacingOccurrences(of: "{\(k)}", with: v) }
    return out.replacingOccurrences(of: "{nbsp}", with: "\u{202F}")
  }

  /// « 4 h 30 », « 2 h », « 45 min » — comme formatHours cote JavaScript.
  func hours(_ minutes: Int) -> String {
    let h = minutes / 60, m = minutes % 60
    if h == 0 { return "\(m) \(t("unitMin"))" }
    if m == 0 { return "\(h) \(t("unitH"))" }
    return "\(h) \(t("unitH")) \(String(format: "%02d", m))"
  }
}

extension Color {
  init(hex: String) {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    var v: UInt64 = 0
    Scanner(string: s).scanHexInt64(&v)
    let r = Double((v >> 16) & 0xFF) / 255
    let g = Double((v >> 8) & 0xFF) / 255
    let b = Double(v & 0xFF) / 255
    self.init(red: r, green: g, blue: b)
  }
}

// MARK: - Les chiffres, jour par jour

struct Daily {
  var start: Date
  var minutes: Int
  var pickups: Int
}

struct AppUse: Identifiable {
  var id: String
  var name: String
  var minutes: Int
  var token: ApplicationToken?
}

/// Un passage sur toutes les tranches, une fois : la sequence ne se
/// parcourt pas deux fois, et chaque scene en a besoin en entier.
func collect(_ data: DeviceActivityResults<DeviceActivityData>) async -> (days: [Daily], apps: [AppUse]) {
  var days: [Date: Daily] = [:]
  var apps: [String: AppUse] = [:]
  let cal = Calendar.current

  for await d in data {
    for await seg in d.activitySegments {
      let day = cal.startOfDay(for: seg.dateInterval.start)
      var cur = days[day] ?? Daily(start: day, minutes: 0, pickups: 0)
      cur.minutes += Int(seg.totalActivityDuration / 60)
      for await cat in seg.categories {
        for await app in cat.applications {
          cur.pickups += app.numberOfPickups
          let id = app.application.bundleIdentifier ?? app.application.localizedDisplayName ?? "?"
          var a = apps[id] ?? AppUse(
            id: id, name: app.application.localizedDisplayName ?? id, minutes: 0,
            token: app.application.token
          )
          a.minutes += Int(app.totalActivityDuration / 60)
          apps[id] = a
        }
      }
      days[day] = cur
    }
  }
  return (
    days.values.sorted { $0.start < $1.start },
    apps.values.sorted { $0.minutes > $1.minutes }
  )
}

func average(_ days: [Daily]) -> (minutes: Int, pickups: Int) {
  guard !days.isEmpty else { return (0, 0) }
  let m = days.reduce(0) { $0 + $1.minutes } / days.count
  let p = days.reduce(0) { $0 + $1.pickups } / days.count
  return (m, p)
}

// MARK: - La comparaison

struct CompareModel {
  var real: Int
  var guess: Int
  /// Faux quand Temps d'ecran n'a rien enregistre sur la fenetre : un zero
  /// dessine comme un vrai chiffre dirait « tu n'as pas touche ton
  /// telephone », ce qui est faux et se voit.
  var hasData: Bool
  var theme: Theme
}

struct CompareScene: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .init("compare")
  let content: (CompareModel) -> CompareView

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> CompareModel {
    let (days, _) = await collect(data)
    let guess = defaults?.integer(forKey: "unswipe.report.guess") ?? 0
    return CompareModel(
      real: average(days).minutes, guess: guess,
      hasData: days.contains { $0.minutes > 0 }, theme: Theme.load()
    )
  }
}

/*
 * Le meme verdict que cote JavaScript : en part de l'ESTIMATION, et sans
 * trancher sous dix pour cent — dire « plus que tu ne pensais » pour six
 * minutes d'ecart serait chercher la faute.
 */
enum Verdict { case less, more, same }

func verdict(guess: Int, real: Int) -> (pct: Int, v: Verdict) {
  let pct = Int((Double(abs(real - guess)) / Double(max(1, guess)) * 100).rounded())
  if pct < 10 { return (pct, .same) }
  return (pct, real < guess ? .less : .more)
}

/// Ce que l'extension dit quand elle n'a rien recu. Le parcours continue
/// sur l'estimation, et on le dit — plutot qu'un zero qui aurait l'air vrai.
struct NoData: View {
  let th: Theme

  var body: some View {
    VStack(spacing: 10) {
      Text(th.t("noDataTitle"))
        .font(.system(size: 28, weight: .bold))
        .foregroundColor(th.ink)
        .multilineTextAlignment(.center)
      Text(th.t("noDataBody"))
        .font(.system(size: 15))
        .foregroundColor(th.inkSoft)
        .multilineTextAlignment(.center)
    }
    .padding(.horizontal, 8)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }
}

struct CompareView: View {
  let m: CompareModel

  var body: some View {
    if m.hasData { filled } else { NoData(th: m.theme) }
  }

  @ViewBuilder var filled: some View {
    let th = m.theme
    let (pct, v) = verdict(guess: m.guess, real: m.real)
    let tone: Color = v == .less ? th.good : v == .more ? th.danger : th.accent
    let title = th.t(v == .less ? "lessTitle" : v == .more ? "moreTitle" : "sameTitle")
    let sub = th.t(v == .less ? "lessSub" : v == .more ? "moreSub" : "sameSub")
    let delta = th.t(v == .less ? "deltaLess" : v == .more ? "deltaMore" : "deltaSame", ["p": String(pct)])
    let top = max(m.guess, m.real, 1)

    VStack(spacing: 10) {
      Text(title)
        .font(.system(size: 28, weight: .bold))
        .foregroundColor(th.ink)
        .multilineTextAlignment(.center)
      Text(sub)
        .font(.system(size: 15))
        .foregroundColor(th.inkSoft)
        .multilineTextAlignment(.center)

      ZStack {
        Circle().fill(tone).frame(width: 48, height: 48)
        Image(systemName: v == .less ? "arrow.down" : v == .more ? "arrow.up" : "equal")
          .font(.system(size: 20, weight: .bold))
          .foregroundColor(.white)
      }
      .padding(.top, 18)

      Text(th.hours(m.real))
        .font(.system(size: 56, weight: .bold))
        .foregroundColor(th.ink)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
      Text(delta)
        .font(.system(size: 15))
        .foregroundColor(th.inkSoft)

      HStack(alignment: .bottom, spacing: 14) {
        Bar(h: CGFloat(m.guess) / CGFloat(top), fill: th.inkSoft.opacity(0.28), rim: th.inkSoft,
            value: th.hours(m.guess), label: th.t("guessLabel"), ink: th.ink, soft: th.inkSoft, valueTone: th.ink)
        Bar(h: CGFloat(m.real) / CGFloat(top), fill: tone.opacity(0.32), rim: tone,
            value: th.hours(m.real), label: th.t("realLabel"), ink: th.ink, soft: th.inkSoft, valueTone: tone)
      }
      .padding(.top, 22)
    }
    .padding(.horizontal, 8)
    // Cale en haut : la vue hote a une hauteur fixe, et un contenu centre
    // qui deborde perd son titre avant ses pieds.
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(Color.clear)
  }
}

struct Bar: View {
  let h: CGFloat
  let fill: Color
  let rim: Color
  let value: String
  let label: String
  let ink: Color
  let soft: Color
  let valueTone: Color

  var body: some View {
    VStack(spacing: 4) {
      VStack {
        Spacer(minLength: 0)
        RoundedRectangle(cornerRadius: 6)
          .fill(fill)
          .overlay(alignment: .top) { Rectangle().fill(rim).frame(height: 3) }
          .frame(height: max(6, 150 * h))
      }
      .frame(height: 150)
      Text(value).font(.system(size: 16, weight: .semibold)).foregroundColor(valueTone)
      Text(label).font(.system(size: 12)).foregroundColor(soft)
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - La part de la journee, et les annees

/*
 * Les deux ecrans qui suivent la comparaison raisonnent sur le VRAI chiffre.
 * Comme l'app ne le lira jamais, ils se dessinent ici aussi — sinon on
 * montrait « 5 h » sur un ecran et « 2 h » sur le suivant, l'estimation
 * ayant repris la main sans le dire. Les constantes et les formules sont
 * celles de calculations.ts, recopiees : seize heures eveillees, une vie de
 * quatre-vingts ans, huit heures de travail.
 */
private let LIFE_YEARS = 80
private let WAKING_HOURS = 16
/// Huit heures de travail sur seize eveillees : la moitie de la grille.
private let WORK = 50
private let WORK_GREEN = Color(hex: "#2E9E5B")

/// Part de la journee EVEILLEE, en pour cent, plafonnee a cent.
func wakingShare(_ minutes: Int) -> Int {
  Int((min(1, Double(minutes) / 60 / Double(WAKING_HOURS)) * 100).rounded())
}

struct ShareModel {
  var minutes: Int
  var hasData: Bool
  var theme: Theme
}

struct ShareScene: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .init("share")
  let content: (ShareModel) -> ShareView

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> ShareModel {
    let (days, _) = await collect(data)
    return ShareModel(
      minutes: average(days).minutes,
      hasData: days.contains { $0.minutes > 0 }, theme: Theme.load()
    )
  }
}

/// Une entree de legende : une pastille, un mot.
struct Key: View {
  let colour: Color
  let label: String
  let soft: Color

  var body: some View {
    HStack(spacing: 6) {
      RoundedRectangle(cornerRadius: 3).fill(colour).frame(width: 9, height: 9)
      Text(label).font(.system(size: 12)).foregroundColor(soft)
    }
  }
}

/*
 * La grille de cent cases, comme cote JavaScript : le travail pose en bas et
 * qui ne bouge pas, l'ecran qui vient s'allumer par-dessus case par case,
 * et ce qui reste qu'on voit retrecir. Le titre, lui, reste a l'app : il ne
 * contient aucun chiffre.
 */
struct ShareView: View {
  let m: ShareModel
  @State private var lit = 0

  var body: some View {
    if m.hasData { grid } else { NoData(th: m.theme) }
  }

  @ViewBuilder var grid: some View {
    let th = m.theme
    let screen = wakingShare(m.minutes)
    // L'ecran ne peut pas occuper plus que ce que le travail laisse ; quand
    // ca deborde, on le dit — l'ecran mange les heures de travail.
    let room = 100 - WORK
    let shown = min(screen, room)
    let over = screen > room
    let done = lit >= shown
    let columns = Array(repeating: GridItem(.fixed(20.5), spacing: 5), count: 10)

    VStack(spacing: 0) {
      LazyVGrid(columns: columns, spacing: 5) {
        ForEach(0..<100, id: \.self) { i in
          RoundedRectangle(cornerRadius: 4)
            .fill(i >= 100 - WORK ? WORK_GREEN : i < lit ? th.danger : th.ink.opacity(0.07))
            .frame(width: 20.5, height: 20.5)
            .animation(.easeOut(duration: 0.42), value: lit)
        }
      }
      .frame(width: 250)
      .padding(.vertical, 24)

      HStack(spacing: 18) {
        Key(colour: th.danger, label: th.t("screenKey", ["n": String(lit)]), soft: th.inkSoft)
        Key(colour: WORK_GREEN, label: th.t("workKey", ["n": String(WORK)]), soft: th.inkSoft)
        Key(colour: th.ink.opacity(0.14), label: th.t("freeKey"), soft: th.inkSoft)
      }
      .padding(.bottom, 18)

      // La part PARTIE, pas le temps qui reste : c'est ce qui pese.
      Text(done ? "\(screen)\u{202F}%" : "…")
        .font(.system(size: 56, weight: .bold))
        .foregroundColor(th.danger)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
      Text(!done ? "…" : over ? th.t("overflow") : th.t("gone"))
        .font(.system(size: 17))
        .foregroundColor(th.inkSoft)
        .multilineTextAlignment(.center)
        .padding(.top, 8)
    }
    .padding(.horizontal, 8)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .task {
      // 88 ms par case, comme cote JavaScript : assez lent qu'on voie la
      // part grandir et que ca pese.
      guard shown > 0 else { return }
      for i in 1...shown {
        try? await Task.sleep(nanoseconds: 88_000_000)
        lit = i
      }
    }
  }
}

struct YearsModel {
  var years: Int
  var left: Int
  var hasData: Bool
  var theme: Theme
}

struct YearsScene: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .init("years")
  let content: (YearsModel) -> YearsView

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> YearsModel {
    let (days, _) = await collect(data)
    let stored = defaults?.integer(forKey: "unswipe.report.age") ?? 0
    let age = stored > 0 ? stored : 24
    // Sur les annees qu'il RESTE, pas sur quatre-vingts pour tout le monde.
    let left = max(1, LIFE_YEARS - age)
    let minutes = average(days).minutes
    let years = Int((Double(minutes) / 60 / Double(WAKING_HOURS) * Double(left)).rounded())
    return YearsModel(
      years: years, left: left,
      hasData: days.contains { $0.minutes > 0 }, theme: Theme.load()
    )
  }
}

/// Le nombre d'annees monte au lieu de s'afficher : c'est le trajet qui
/// fait mal, pas la valeur finale.
struct YearsView: View {
  let m: YearsModel
  @State private var y = 0

  var body: some View {
    if m.hasData { counted } else { NoData(th: m.theme) }
  }

  @ViewBuilder var counted: some View {
    let th = m.theme

    VStack(spacing: 6) {
      Text(th.t("lifeOf", ["n": String(m.left)]))
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(th.inkSoft)
      Text(th.t("years", ["y": String(y)]))
        .font(.system(size: 56, weight: .bold))
        .foregroundColor(th.danger)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
      Text(th.t("bodyShort"))
        .font(.system(size: 17))
        .foregroundColor(th.inkSoft)
        .multilineTextAlignment(.center)
      Text(th.t("basis"))
        .font(.system(size: 12))
        .foregroundColor(th.inkSoft.opacity(0.8))
        .multilineTextAlignment(.center)
        .padding(.top, 10)
    }
    .padding(.horizontal, 8)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .task {
      // 1,6 s quel que soit le chiffre : un petit nombre ne doit pas defiler
      // plus vite qu'un grand.
      let steps = 34
      for i in 1...steps {
        try? await Task.sleep(nanoseconds: 1_600_000_000 / UInt64(steps))
        y = Int((Double(m.years) * Double(i) / Double(steps)).rounded())
      }
    }
  }
}

// MARK: - L'analyse

struct OverviewModel {
  var days: [Daily]
  var avg: Int
  var pickups: Int
  var apps: [AppUse]
  var theme: Theme
}

struct OverviewScene: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .init("overview")
  let content: (OverviewModel) -> OverviewView

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> OverviewModel {
    let (days, apps) = await collect(data)
    let a = average(days)
    return OverviewModel(days: days, avg: a.minutes, pickups: a.pickups, apps: Array(apps.prefix(3)), theme: Theme.load())
  }
}

struct OverviewView: View {
  let m: OverviewModel

  var body: some View {
    if m.days.contains(where: { $0.minutes > 0 }) { filled } else { NoData(th: m.theme) }
  }

  @ViewBuilder var filled: some View {
    let th = m.theme
    let top = max(1, m.days.map { $0.minutes }.max() ?? 1)
    let fmt: DateFormatter = { let f = DateFormatter(); f.setLocalizedDateFormatFromTemplate("EEEEE"); return f }()

    VStack(spacing: 8) {
      Text(th.t("analysisTitle"))
        .font(.system(size: 28, weight: .bold))
        .foregroundColor(th.ink)
        .multilineTextAlignment(.center)
      Text(th.hours(m.avg))
        .font(.system(size: 56, weight: .bold))
        .foregroundColor(th.danger)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
      Text(th.t("analysisSub")).font(.system(size: 15)).foregroundColor(th.inkSoft)
      Text(th.t("perYear", ["h": th.hours(m.avg * 365)]))
        .font(.system(size: 13, weight: .semibold))
        .foregroundColor(th.accent)

      // Sept vraies journees. On ne dessine que ce qu'on a recu : un jour
      // sans donnee est une barre vide, pas une barre inventee.
      HStack(alignment: .bottom, spacing: 8) {
        ForEach(Array(m.days.enumerated()), id: \.offset) { _, d in
          VStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 5)
              .fill(th.danger.opacity(0.75))
              .frame(height: max(4, 110 * CGFloat(d.minutes) / CGFloat(top)))
            Text(fmt.string(from: d.start)).font(.system(size: 11)).foregroundColor(th.inkSoft)
          }
          .frame(maxWidth: .infinity)
        }
      }
      .frame(height: 130, alignment: .bottom)
      .padding(.top, 18)

      if m.pickups > 0 {
        HStack {
          Text(th.t("pickupsTitle").uppercased()).font(.system(size: 11, weight: .semibold)).foregroundColor(th.inkSoft)
          Spacer()
          Text(th.t("pickupsBody", ["n": String(m.pickups), "y": String(m.pickups * 365)]))
            .font(.system(size: 15, weight: .semibold)).foregroundColor(th.ink)
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 16).fill(th.ink.opacity(0.06)))
        .padding(.top, 12)
      }

      if !m.apps.isEmpty {
        VStack(alignment: .leading, spacing: 10) {
          Text(th.t("topApps")).font(.system(size: 16, weight: .semibold)).foregroundColor(th.ink)
          ForEach(m.apps, id: \.id) { a in
            HStack {
              // L'etiquette d'Apple : nom et icone, sans que l'app hote sache
              // jamais lesquels — c'est tout l'interet de l'extension.
              if let token = a.token {
                Label(token).font(.system(size: 15)).foregroundColor(th.ink)
              } else {
                Text(a.name).font(.system(size: 15)).foregroundColor(th.ink)
              }
              Spacer()
              Text(th.hours(a.minutes)).font(.system(size: 15, weight: .semibold)).foregroundColor(th.danger)
            }
          }
        }
        .padding(.top, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(.horizontal, 8)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(Color.clear)
  }
}
