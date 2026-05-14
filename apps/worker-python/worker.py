"""KEDA-scaled background worker that drains a queue and writes outcomes.

Why this exists in the workshop:
- Demonstrates an event-driven workload that scales to zero
- Used in Module 06 (intrinsic outage) to show graceful shutdown via SIGTERM
- Used in Module 08 (optimization) to demonstrate KEDA on Service Bus or Storage Queue
"""
import os
import signal
import sys
import time
import logging
from prometheus_client import Counter, Histogram, start_http_server

VERSION = os.getenv("APP_VERSION", "v1")
REGION = os.getenv("REGION", "unknown")
SLEEP_MS = int(os.getenv("WORK_SLEEP_MS", "250"))
QUEUE = os.getenv("QUEUE_NAME", "orders")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("worker")

processed = Counter("worker_processed_total", "Items processed", ["queue", "version"])
duration  = Histogram("worker_item_duration_seconds", "Per-item duration", ["queue", "version"])

shutdown = False

def _sigterm(signum, _frame):
    global shutdown
    log.info("received signal %s, draining...", signum)
    shutdown = True

signal.signal(signal.SIGTERM, _sigterm)
signal.signal(signal.SIGINT, _sigterm)


def fake_dequeue():
    """In real life: pull from Service Bus / Storage Queue.
    For the workshop we synthesize work so the lab needs no extra Azure resources."""
    time.sleep(SLEEP_MS / 1000.0)
    return {"id": int(time.time() * 1000)}


def main():
    start_http_server(9090)  # /metrics
    log.info("worker starting version=%s region=%s queue=%s", VERSION, REGION, QUEUE)
    while not shutdown:
        with duration.labels(QUEUE, VERSION).time():
            item = fake_dequeue()
            log.info("processed item id=%s", item["id"])
            processed.labels(QUEUE, VERSION).inc()
    log.info("worker stopped cleanly")
    sys.exit(0)


if __name__ == "__main__":
    main()
