import AVFoundation
import AppKit
import Foundation

// Extrait N images reparties sur la duree d une video.
// usage : frames <video> <dossier-sortie> [nombre]

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("usage: frames <video> <outdir> [count]")
    exit(1)
}
let url    = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let count  = args.count > 3 ? (Int(args[3]) ?? 12) : 12

let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter  = .zero
gen.maximumSize = CGSize(width: 700, height: 700)   // limite le poids des PNG

let sem = DispatchSemaphore(value: 0)
var duration: Double = 0

Task {
    if let d = try? await asset.load(.duration) {
        duration = CMTimeGetSeconds(d)
    }
    sem.signal()
}
sem.wait()

guard duration > 0 else {
    print("ERREUR : duree nulle — fichier illisible ou format non supporte")
    exit(1)
}

try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
print(String(format: "duree : %.1f s — %d images", duration, count))

for i in 0..<count {
    let t = duration * Double(i) / Double(count)
    let time = CMTime(seconds: t, preferredTimescale: 600)
    guard let cg = try? gen.copyCGImage(at: time, actualTime: nil) else { continue }
    let rep = NSBitmapImageRep(cgImage: cg)
    guard let data = rep.representation(using: .png, properties: [:]) else { continue }
    let f = outDir.appendingPathComponent(String(format: "frame_%02d.png", i))
    try? data.write(to: f)
    print(String(format: "  frame_%02d.png  t=%.1fs", i, t))
}
