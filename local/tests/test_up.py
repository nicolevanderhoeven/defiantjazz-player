"""Runs local/up.sh for real, with a stubbed `docker` on PATH and real listeners standing in for busy ports."""
import os
import shutil
import socket
import stat
import subprocess
import tempfile
import unittest
from contextlib import closing, contextmanager

UP_SH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "up.sh")

STUB = """#!/bin/sh
orig="$*"
shift
while [ "$1" = "--profile" ]; do shift 2; done
cmd="$1"
case "$cmd" in
  version) exit 0 ;;
  port) [ -n "$STUB_OWNED_PORT" ] && echo "127.0.0.1:$STUB_OWNED_PORT" && exit 0; exit 1 ;;
  logs) [ -n "$STUB_LOGIN" ] && echo "  gcx login dj-local --yes --server http://localhost:$DJ_GRAFANA_PORT --token t0ken"; exit 0 ;;
  up) echo "$orig; DJ_GRAFANA_PORT=$DJ_GRAFANA_PORT DJ_MCP_PORT=$DJ_MCP_PORT DJ_BOARD_PORT=$DJ_BOARD_PORT DJ_ASSISTANT_PORT=$DJ_ASSISTANT_PORT PROFILE=$STUB_PROFILE_SEEN" >>"$STUB_LOG"; exit "${STUB_UP_EXIT:-0}" ;;
esac
exit 0
"""


@contextmanager
def listener():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    s.listen(1)
    try:
        yield s.getsockname()[1]
    finally:
        s.close()


def free_port():
    with closing(socket.socket()) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class UpScript(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.dir)
        self.bin = os.path.join(self.dir, "bin")
        os.mkdir(self.bin)
        docker = os.path.join(self.bin, "docker")
        with open(docker, "w") as f:
            f.write(STUB)
        os.chmod(docker, os.stat(docker).st_mode | stat.S_IEXEC)
        self.stack = os.path.join(self.dir, "local")
        os.mkdir(self.stack)
        self.script = os.path.join(self.stack, "up.sh")
        shutil.copy(UP_SH, self.script)
        self.log = os.path.join(self.dir, "docker.log")

    def run_up(self, grafana, mcp, board=None, login=True, up_exit=0, args=(), owned="", extra=None):
        env = dict(
            os.environ,
            PATH=self.bin + os.pathsep + os.environ["PATH"],
            DJ_GRAFANA_PORT=str(grafana),
            DJ_MCP_PORT=str(mcp),
            DJ_BOARD_PORT=str(board or free_port()),
            DJ_UP_WAIT="0",
            STUB_LOG=self.log,
            STUB_UP_EXIT=str(up_exit),
            STUB_LOGIN="1" if login else "",
            STUB_OWNED_PORT=str(owned),
            **(extra or {}),
        )
        return subprocess.run(["bash", self.script, *args], env=env, capture_output=True, text=True, timeout=60)

    def env_file(self):
        path = os.path.join(self.stack, ".env")
        if not os.path.exists(path):
            return {}
        with open(path) as f:
            return dict(line.strip().split("=", 1) for line in f if "=" in line)

    def test_free_ports_are_kept_and_printed(self):
        g, m = free_port(), free_port()
        r = self.run_up(g, m)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.env_file(), {})
        self.assertIn(f"http://localhost:{g}", r.stdout)
        self.assertIn(f"http://localhost:{m}/mcp", r.stdout)
        self.assertIn(f"gcx login dj-local --yes --server http://localhost:{g} --token", r.stdout)

    def test_busy_ports_are_replaced_saved_and_printed(self):
        with listener() as g, listener() as m:
            r = self.run_up(g, m)
        self.assertEqual(r.returncode, 0, r.stderr)
        saved = self.env_file()
        ng, nm = int(saved["DJ_GRAFANA_PORT"]), int(saved["DJ_MCP_PORT"])
        self.assertNotIn(ng, (g, m))
        self.assertNotIn(nm, (g, m))
        self.assertNotEqual(ng, nm)
        self.assertIn(f"http://localhost:{ng}", r.stdout)
        self.assertIn(f"http://localhost:{nm}/mcp", r.stdout)
        self.assertIn(f"--server http://localhost:{ng} ", r.stdout)
        with open(self.log) as f:
            self.assertIn(f"DJ_GRAFANA_PORT={ng} DJ_MCP_PORT={nm}", f.read())

    def test_a_busy_evidence_board_port_is_replaced_saved_and_printed(self):
        g, m = free_port(), free_port()
        with listener() as b:
            r = self.run_up(g, m, board=b)
        self.assertEqual(r.returncode, 0, r.stderr)
        nb = int(self.env_file()["DJ_BOARD_PORT"])
        self.assertNotEqual(nb, b)
        self.assertIn(f"http://localhost:{nb}/mcp", r.stdout)
        with open(self.log) as f:
            self.assertIn(f"DJ_BOARD_PORT={nb}", f.read())

    def test_saved_ports_are_reused_on_the_next_run(self):
        with listener() as g:
            m = free_port()
            self.run_up(g, m)
            first = self.env_file()
            env_text = open(os.path.join(self.stack, ".env")).read()
            r = subprocess.run(
                ["bash", self.script],
                env=dict(os.environ, PATH=self.bin + os.pathsep + os.environ["PATH"], DJ_UP_WAIT="0",
                         STUB_LOG=self.log, STUB_LOGIN="1", DJ_MCP_PORT=str(m), DJ_BOARD_PORT=str(free_port())),
                capture_output=True, text=True, timeout=60,
            )
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.env_file(), first)
        self.assertEqual(open(os.path.join(self.stack, ".env")).read(), env_text)
        self.assertIn(f"http://localhost:{first['DJ_GRAFANA_PORT']}", r.stdout)

    def test_existing_env_lines_are_kept(self):
        with open(os.path.join(self.stack, ".env"), "w") as f:
            f.write("GRAFANA_ADMIN_USER=admin\nGRAFANA_ADMIN_PASSWORD=pw-for-test\n")
        with listener() as g:
            r = self.run_up(g, free_port())
        self.assertEqual(r.returncode, 0, r.stderr)
        saved = self.env_file()
        self.assertEqual(saved["GRAFANA_ADMIN_USER"], "admin")
        self.assertEqual(saved["GRAFANA_ADMIN_PASSWORD"], "pw-for-test")
        self.assertNotEqual(int(saved["DJ_GRAFANA_PORT"]), g)

    def test_missing_login_line_gives_the_command_to_get_it(self):
        r = self.run_up(free_port(), free_port(), login=False)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("docker compose logs --no-log-prefix gcx-token", r.stdout)

    def test_a_busy_port_held_by_this_stack_is_left_alone(self):
        with listener() as g:
            m = free_port()
            r = self.run_up(g, m, owned=g)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.env_file(), {})
        self.assertIn(f"http://localhost:{g}", r.stdout)

    def test_assistant_profile_port_is_moved_when_busy(self):
        with listener() as a:
            r = self.run_up(free_port(), free_port(), args=("--profile", "assistant"), extra={"DJ_ASSISTANT_PORT": str(a)})
        self.assertEqual(r.returncode, 0, r.stderr)
        moved = int(self.env_file()["DJ_ASSISTANT_PORT"])
        self.assertNotEqual(moved, a)
        with open(self.log) as f:
            logged = f.read()
        self.assertIn("compose --profile assistant up -d;", logged)
        self.assertIn(f"DJ_ASSISTANT_PORT={moved}", logged)

    def test_compose_failure_is_reported(self):
        r = self.run_up(free_port(), free_port(), up_exit=3)
        self.assertEqual(r.returncode, 3)
        self.assertNotIn("Grafana:", r.stdout)


if __name__ == "__main__":
    unittest.main()
