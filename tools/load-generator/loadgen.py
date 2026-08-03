#!/usr/bin/env python3
import argparse
import asyncio
import json
import math
import re
import time
from collections import Counter
from pathlib import Path

PARSER_PATTERN = re.compile(r"\bparser=([^\s]+)")


class Results:
    def __init__(self):
        self.connections = 0
        self.reconnects = 0
        self.failures = 0
        self.sent = 0
        self.acked = 0
        self.duplicate_acks = 0
        self.latencies_ms = []
        self.parsers = Counter()
        self.ack_ids = set()
        self.outage_started = None
        self.recovered_at = None

    def failure(self):
        self.failures += 1
        if self.outage_started is None:
            self.outage_started = time.monotonic()

    def success(self):
        if self.outage_started is not None and self.recovered_at is None:
            self.recovered_at = time.monotonic()

    def report(self, elapsed):
        ordered = sorted(self.latencies_ms)

        def percentile(value):
            if not ordered:
                return 0
            return ordered[min(len(ordered) - 1, math.ceil(len(ordered) * value) - 1)]

        rto = None
        if self.outage_started is not None and self.recovered_at is not None:
            rto = round(self.recovered_at - self.outage_started, 3)
        return {
            "elapsed_seconds": round(elapsed, 3),
            "connections": self.connections,
            "reconnects": self.reconnects,
            "connection_failures": self.failures,
            "messages_sent": self.sent,
            "messages_acked": self.acked,
            "messages_lost": self.sent - self.acked,
            "duplicate_acks": self.duplicate_acks,
            "rto_seconds": rto,
            "latency_ms": {
                "p50": percentile(0.50),
                "p95": percentile(0.95),
                "p99": percentile(0.99),
            },
            "parser_versions": dict(sorted(self.parsers.items())),
        }


async def client(client_id, args, results, deadline):
    sequence = 0
    connected_once = False
    backoff = 0.25
    while deadline is None or time.monotonic() < deadline:
        writer = None
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(args.host, args.port), args.connect_timeout
            )
            await asyncio.wait_for(reader.readline(), args.read_timeout)
            results.connections += 1
            if connected_once:
                results.reconnects += 1
                results.success()
            connected_once = True
            backoff = 0.25
            if args.cohort:
                writer.write(f"COHORT {args.cohort}\n".encode())
                await writer.drain()
                await asyncio.wait_for(reader.readline(), args.read_timeout)

            while deadline is None or time.monotonic() < deadline:
                sequence += 1
                payload = f"QU/DEST0001/ORIG0001/HDR001/PAYLOAD/{client_id}-{sequence}"
                started = time.monotonic()
                writer.write(f"MSG {payload}\n".encode())
                await writer.drain()
                results.sent += 1
                ack = (await asyncio.wait_for(reader.readline(), args.read_timeout)).decode().strip()
                if not ack.startswith("ACK "):
                    raise ConnectionError(ack or "connection closed before ACK")
                results.acked += 1
                results.latencies_ms.append(round((time.monotonic() - started) * 1000, 3))
                parser_match = PARSER_PATTERN.search(ack)
                if parser_match:
                    results.parsers[parser_match.group(1)] += 1
                ack_id = next((part[3:] for part in ack.split() if part.startswith("id=")), None)
                if ack_id in results.ack_ids:
                    results.duplicate_acks += 1
                elif ack_id:
                    results.ack_ids.add(ack_id)
                if deadline is None:
                    return
                await asyncio.sleep(args.interval)
        except (OSError, asyncio.TimeoutError, ConnectionError):
            results.failure()
            if deadline is None:
                return
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, args.max_backoff)
        finally:
            if writer is not None:
                writer.close()
                try:
                    await writer.wait_closed()
                except OSError:
                    pass


async def run(args):
    results = Results()
    started = time.monotonic()
    deadline = started + args.duration if args.duration > 0 else None
    await asyncio.gather(*(client(index, args, results, deadline) for index in range(args.sessions)))
    report = results.report(time.monotonic() - started)
    print(json.dumps(report, indent=2))
    if args.json_output:
        output = Path(args.json_output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    loss_pct = 100 * report["messages_lost"] / max(report["messages_sent"], 1)
    return 1 if loss_pct > args.drop_pct or report["latency_ms"]["p99"] > args.rtt_p99_ms else 0


def duration(value):
    return float(value[:-1] if value.endswith("s") else value)


def parse_args():
    parser = argparse.ArgumentParser(description="Skybridge reconnecting TCP load generator")
    parser.add_argument("mode", choices=["tcp"])
    parser.add_argument("host")
    parser.add_argument("port", type=int)
    parser.add_argument("sessions", type=int)
    parser.add_argument("--duration", type=duration, default=0)
    parser.add_argument("--keep-alive", action="store_true")
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--cohort")
    parser.add_argument("--connect-timeout", type=float, default=5.0)
    parser.add_argument("--read-timeout", type=float, default=5.0)
    parser.add_argument("--max-backoff", type=float, default=5.0)
    parser.add_argument("--rtt-p99-ms", type=float, default=250)
    parser.add_argument("--drop-pct", type=float, default=1)
    parser.add_argument("--json-output")
    args = parser.parse_args()
    if args.keep_alive:
        args.duration = 600
    return args


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
