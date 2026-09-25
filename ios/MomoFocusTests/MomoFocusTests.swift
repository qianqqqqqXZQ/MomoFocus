import XCTest
@testable import MomoFocus

final class MomoFocusTests: XCTestCase {
    func testDefaultDurations() {
        let task = FocusTask(text: "测试")
        XCTAssertEqual(task.focusMinutes, 25)
        XCTAssertEqual(task.breakMinutes, 5)
    }

    func testSessionStatusIsCodable() throws {
        let session = FocusSession(taskID: UUID(), taskName: "测试", seconds: 120, rounds: 0, status: .abandoned)
        let data = try JSONEncoder().encode(session)
        let decoded = try JSONDecoder().decode(FocusSession.self, from: data)
        XCTAssertEqual(decoded, session)
    }
}
