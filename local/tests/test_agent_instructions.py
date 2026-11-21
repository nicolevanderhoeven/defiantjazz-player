"""The agent's instructions and the files that keep it off the raw evidence must stay in step."""
import json
import os
import unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
BLOCKED = ["telemetry", "game", "loader", "local"]


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


class AgentInstructions(unittest.TestCase):
    def test_agent_kit_copy_matches_root(self):
        self.assertEqual(read("AGENTS.md"), read("agent-kit", "AGENTS.md"),
                         "agent-kit/AGENTS.md must be a copy of AGENTS.md: run cp AGENTS.md agent-kit/AGENTS.md")

    def test_claude_md_points_to_agents_md(self):
        self.assertIn("@AGENTS.md", read("CLAUDE.md").split())

    def test_cursorignore_blocks_the_evidence_folders(self):
        lines = [l.strip() for l in read(".cursorignore").splitlines() if l.strip() and not l.startswith("#")]
        for d in BLOCKED:
            self.assertIn(d + "/", lines)

    def test_claude_settings_deny_reading_the_evidence(self):
        deny = json.loads(read(".claude", "settings.json"))["permissions"]["deny"]
        for d in BLOCKED[:3]:
            self.assertIn("Read(./%s/**)" % d, deny)


if __name__ == "__main__":
    unittest.main()
