# The loader for the local stack: Python and the loader's two small dependencies. The loader itself and
# the telemetry are mounted read-only by docker-compose.yml, so editing them needs no rebuild.
FROM python:3.12-slim
WORKDIR /app
COPY loader/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
ENTRYPOINT ["python", "/app/loader/load.py"]
