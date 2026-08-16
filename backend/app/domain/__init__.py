"""Pure-Python domain layer for the fertilizer recommendation engine.

Nothing in this package may import FastAPI, pydantic, SQLAlchemy or any other
web/DB dependency. The engine must remain callable from a plain Python REPL,
a test, a CLI or a notebook. `backend/tests/test_engine.py` enforces this.
"""
