import importlib.util
import pathlib
import unittest

MODULE_PATH = pathlib.Path(__file__).with_name("loadgen.py")
SPEC = importlib.util.spec_from_file_location("loadgen", MODULE_PATH)
LOADGEN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LOADGEN)


class ResultsTests(unittest.TestCase):
    def test_report_includes_loss_percentiles_and_parser_distribution(self):
        results = LOADGEN.Results()
        results.sent = 4
        results.acked = 3
        results.latencies_ms = [10, 20, 30]
        results.parsers.update(["v1", "v1", "v2"])

        report = results.report(5)

        self.assertEqual(report["messages_lost"], 1)
        self.assertEqual(report["latency_ms"], {"p50": 20, "p95": 30, "p99": 30})
        self.assertEqual(report["parser_versions"], {"v1": 2, "v2": 1})

    def test_recovery_reports_rto(self):
        results = LOADGEN.Results()
        results.outage_started = 10
        results.recovered_at = 12.5

        self.assertEqual(results.report(20)["rto_seconds"], 2.5)

    def test_duration_accepts_seconds_suffix(self):
        self.assertEqual(LOADGEN.duration("60s"), 60)
        self.assertEqual(LOADGEN.duration("2.5"), 2.5)


if __name__ == "__main__":
    unittest.main()