"""ClaimGraph dev server entry point.

Usage::

    python app.py                # loads data/remote_work.json by default
    python app.py --dataset intermittent_fasting
    python app.py --empty        # start with an empty graph
    python app.py --port 8000

Then open http://localhost:5000 in a browser.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from claimgraph import ClaimGraph
from claimgraph.api import create_app
from claimgraph.storage import load

DEFAULT_DATASET = "remote_work"
DATA_DIR = Path(__file__).resolve().parent / "data"


def _load_initial_graph(dataset: str | None, empty: bool) -> ClaimGraph:
    if empty:
        return ClaimGraph()
    name = dataset or DEFAULT_DATASET
    path = DATA_DIR / f"{name}.json"
    if not path.exists():
        print(f"[claimgraph] dataset '{name}' not found at {path}, starting empty")
        return ClaimGraph()
    print(f"[claimgraph] loading dataset {path}")
    return load(path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the ClaimGraph dev server.")
    parser.add_argument(
        "--dataset",
        default=None,
        help=f"name of a JSON dataset under data/ (default: {DEFAULT_DATASET})",
    )
    parser.add_argument(
        "--empty",
        action="store_true",
        help="start with an empty graph (ignores --dataset)",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    graph = _load_initial_graph(args.dataset, args.empty)
    app = create_app(graph)
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
