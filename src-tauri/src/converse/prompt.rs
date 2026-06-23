//! Prompt construction for Conversation Mode. The answer is spoken aloud, so the
//! system prompt forbids markdown/lists/symbols and caps length.

use super::session::SessionContext;

pub fn system_prompt() -> String {
    "You narrate the live state of a coding session out loud for the user. \
Answer in 1 to 3 short spoken sentences, plain conversational prose. \
No markdown, no code blocks, no bullet lists, no file paths unless essential, no symbols. \
Say what the agent just did, what it is doing now, and whether it is waiting on the user. \
Be direct and concrete; this will be read aloud by a voice."
        .to_string()
}

pub fn user_prompt(question: &str, ctx: &SessionContext) -> String {
    let mut s = String::new();
    s.push_str(&format!(
        "Repo: {}\nBranch: {}\n\nRecent session activity (oldest to newest):\n",
        if ctx.cwd.is_empty() { "unknown" } else { &ctx.cwd },
        if ctx.git_branch.is_empty() {
            "unknown"
        } else {
            &ctx.git_branch
        }
    ));
    for turn in &ctx.turns {
        let who = if turn.role == "assistant" {
            "Agent"
        } else {
            "User"
        };
        s.push_str(&format!("{}: {}\n", who, turn.text));
    }
    s.push_str(&format!(
        "\nThe user just asked, by voice: \"{}\"\nAnswer out loud, briefly.",
        question.trim()
    ));
    s
}
