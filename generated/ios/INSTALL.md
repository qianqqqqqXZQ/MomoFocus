# MomoFocus iOS 安装说明

本仓库提供的是可签名的 SwiftUI iOS 工程，不包含 Apple 证书、私钥或已签名 IPA。

## Codemagic

1. 使用 Apple Developer 账号创建 App ID：`com.momofocus.ios`。
2. 在 Codemagic 导入本仓库，选择 `codemagic.yaml` 的 `ios-release` workflow。
3. 配置 Apple Developer 集成，确认 `DEVELOPMENT_TEAM`、`CM_EMAIL` 和 App Store Connect 权限。
4. 手动触发构建，构建产物中的 `MomoFocus.ipa` 可以通过 TestFlight 或 Xcode 安装。

不要把证书、Provisioning Profile、App Store Connect 私钥或 API Key 写入仓库。它们只能配置在 Codemagic 的安全变量或 Apple 集成中。

## Xcode 本地导出

在 macOS 上打开 `ios/MomoFocus.xcodeproj`，选择 `MomoFocus` scheme，绑定自己的 Team，连接设备后使用 Product > Archive 导出。Live Activity 需要在真机或支持的模拟器上验证；灵动岛只在支持该硬件的 iPhone 上显示。

最低系统版本为 iOS 16.1。锁屏 Live Activity 可在支持 ActivityKit 的设备上工作，Dynamic Island 仅在相应机型显示。
