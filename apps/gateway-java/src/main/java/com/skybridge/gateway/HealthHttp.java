package com.skybridge.gateway;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/**
 * Tiny health endpoint — Kubernetes probes hit this instead of the metrics
 * HTTPServer so we can fail readyz independently of liveness.
 */
final class HealthHttp {
    static void start(int port, String version, String region) throws IOException {
        HttpServer s = HttpServer.create(new InetSocketAddress(port), 0);
        s.createContext("/healthz", ex -> respond(ex, 200,
                "{\"ok\":true,\"version\":\"" + version + "\",\"region\":\"" + region + "\"}"));
        s.createContext("/readyz", ex -> {
            boolean ready = !GatewayMain.isDraining();
            respond(ex, ready ? 200 : 503,
                "{\"ready\":" + ready + ",\"active\":" + (long) GatewayMain.ACTIVE_CONNECTIONS
                    .labels(version, region).get() + "}");
        });
        s.createContext("/drain", ex -> {
            if (!ex.getRequestMethod().equals("POST")) {
            respond(ex, 405, "{\"error\":\"method-not-allowed\"}");
            return;
            }
            GatewayMain.beginDrain();
            try {
                GatewayMain.awaitDrained(110);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
            respond(ex, 202, "{\"draining\":true}");
        });
        s.setExecutor(Executors.newCachedThreadPool());
        s.start();
    }
    private static void respond(com.sun.net.httpserver.HttpExchange ex, int code, String body) throws IOException {
        byte[] b = body.getBytes();
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(code, b.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(b); }
    }
}
