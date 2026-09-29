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
