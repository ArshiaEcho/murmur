//! Output routing: where a finished transcript goes (paste, Claude Code, capture buffer).

use std::io::Write;

/// Append a cleaned note to the capture buffer file, creating it if absent.
/// `timestamp` is passed in (kept pure/testable, no clock dependency here).
pub fn append_to_capture_buffer(path: &str, text: &str, timestamp: &str) -> std::io::Result<()> {
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?;
    writeln!(f, "- {timestamp} {text}")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn append_creates_and_appends() {
        let path = std::env::temp_dir().join("strat_capture_test.md");
        let _ = std::fs::remove_file(&path);
        let p = path.to_str().unwrap();
        append_to_capture_buffer(p, "first note", "2026-06-22").unwrap();
        append_to_capture_buffer(p, "second note", "2026-06-22").unwrap();
        let body = std::fs::read_to_string(&path).unwrap();
        assert!(body.contains("- 2026-06-22 first note"));
        assert!(body.contains("- 2026-06-22 second note"));
        let _ = std::fs::remove_file(&path);
    }
}
