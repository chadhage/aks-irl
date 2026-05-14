FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY worker.py .
ARG APP_VERSION=v1
ENV APP_VERSION=${APP_VERSION}
USER 1000
EXPOSE 9090
CMD ["python", "worker.py"]
