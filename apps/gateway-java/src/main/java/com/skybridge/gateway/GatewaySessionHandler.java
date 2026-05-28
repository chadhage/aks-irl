package com.skybridge.gateway;

import io.netty.channel.*;
import io.netty.handler.timeout.IdleStateEvent;
import io.prometheus.client.Histogram;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;

/**
 * One instance per accepted socket. Reads newline-framed envelopes, forwards
 * each one to the parser-cpp Service over HTTP/1.1 (kept simple for the
 * workshop — production would use a binary mesh-internal protocol), then
 * writes an ACK back over the same socket.
 *
 * Two cohorts are routed by Istio: the gateway tags messages with an x-cohort
 * header so Module 04 can demonstrate header-based A/B between parser v1/v2.
 */
final class GatewaySessionHandler extends SimpleChannelInboundHandler<String> {

    private static final String PARSER_URL = System.getenv().getOrDefault(
            "PARSER_URL", "http://parser-cpp.messaging.svc.cluster.local:9100/decode");

    private final String version;
    private final String region;
    private String cohort = "default";

    GatewaySessionHandler(String version, String region) {
        this.version = version;
        this.region = region;
    }

    @Override
    public void channelActive(ChannelHandlerContext ctx) {
        GatewayMain.ACTIVE_CONNECTIONS.labels(version, region).inc();
        ctx.writeAndFlush("HELO gateway-java " + version + " region=" + region + "\n");
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) {
        GatewayMain.ACTIVE_CONNECTIONS.labels(version, region).dec();
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String line) {
        // Trivial command set: COHORT <name>  |  MSG <envelope>  |  PING
        if (line.startsWith("COHORT ")) {
            cohort = line.substring(7).trim();
            ctx.writeAndFlush("OK cohort=" + cohort + "\n");
            return;
        }
        if (line.equals("PING")) {
            ctx.writeAndFlush("PONG " + version + "\n");
            return;
        }
        if (!line.startsWith("MSG ")) {
            ctx.writeAndFlush("ERR unknown-verb\n");
            GatewayMain.MESSAGES.labels(version, region, "bad").inc();
            return;
        }
        Histogram.Timer t = GatewayMain.ROUND_TRIP.labels(version, "unknown").startTimer();
        try {
            String response = callParser(line.substring(4), cohort);
            ctx.writeAndFlush("ACK " + response + "\n");
            GatewayMain.MESSAGES.labels(version, region, "ok").inc();
        } catch (Exception e) {
            ctx.writeAndFlush("NAK " + e.getClass().getSimpleName() + "\n");
            GatewayMain.MESSAGES.labels(version, region, "err").inc();
        } finally {
            t.observeDuration();
        }
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        if (evt instanceof IdleStateEvent) ctx.close();
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        ctx.close();
    }

    private static String callParser(String envelope, String cohort) throws Exception {
        HttpURLConnection c = (HttpURLConnection) URI.create(PARSER_URL).toURL().openConnection();
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("x-cohort", cohort);
        c.setRequestProperty("Content-Type", "application/octet-stream");
        c.setConnectTimeout(2_000);
        c.setReadTimeout(2_000);
        try (OutputStream os = c.getOutputStream()) {
            os.write(envelope.getBytes());
        }
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()))) {
            return r.readLine();
        }
    }
}
