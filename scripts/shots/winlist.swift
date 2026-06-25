import CoreGraphics
import Foundation
let opts = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
guard let infoList = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]] else { exit(1) }
for w in infoList {
    let owner = (w[kCGWindowOwnerName as String] as? String) ?? ""
    let name  = (w[kCGWindowName as String] as? String) ?? ""
    let num   = (w[kCGWindowNumber as String] as? Int) ?? 0
    let layer = (w[kCGWindowLayer as String] as? Int) ?? 0
    let b = (w[kCGWindowBounds as String] as? [String: Any]) ?? [:]
    let W = (b["Width"] as? Double) ?? 0, H = (b["Height"] as? Double) ?? 0
    let X = (b["X"] as? Double) ?? 0, Y = (b["Y"] as? Double) ?? 0
    if owner.lowercased().contains("handy") || owner.lowercased().contains("murmur") || name.lowercased().contains("murmur") {
        print("id=\(num) owner=\(owner) name=\(name) layer=\(layer) bounds=\(Int(X)),\(Int(Y)) \(Int(W))x\(Int(H))")
    }
}
