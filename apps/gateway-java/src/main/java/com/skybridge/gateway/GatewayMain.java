package com.skybridge.gateway;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.LineBasedFrameDecoder;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.handler.timeout.IdleStateHandler;
import io.prometheus.client.Counter;
import io.prometheus.client.Gauge;
import io.prometheus.client.Histogram;
import io.prometheus.client.exporter.HTTPServer;

import java.util.concurrent.TimeUnit;

/**
 * Replatformed Skybridge socket gateway — Netty-based TCP server that accepts
 * long-lived connections from airline endpoints, frames Type B / EDIFACT
 * messages, and forwards each message to the C++ parser via the in-mesh
 * Service "parser-cpp:9100". Stateful per-connection — sticky session via NLB.
 *
 * Workshop scope: the wire protocol is intentionally simplified (newline-framed
 * ASCII envelopes) so participants can drive it from `ncat`. The real Type B
 * framing is delegated to the C++ parser; the gateway only routes envelopes.
 */
public final class GatewayMain {

    private static final int TCP_PORT  = Integer.parseInt(env("GATEWAY_TCP_PORT", "4561"));
    private static final int HTTP_PORT = Integer.parseInt(env("GATEWAY_HTTP_PORT", "8080"));
    private static final String VERSION = env("APP_VERSION", "v1");
    private static final String REGION  = env("REGION", "unknown");

    // Prometheus telemetry — exported on /metrics by the HTTPServer below.
    static final Gauge ACTIVE_CONNECTIONS = Gauge.build()
            .name("gateway_active_connections").help("Active TCP sessions")
            .labelNames("version", "region").register();
    static final Counter MESSAGES = Counter.build()
            .name("gateway_messages_total").help("Messages received")
            .labelNames("version", "region", "result").register();
    static final Histogram ROUND_TRIP = Histogram.build()
            .name("gateway_message_roundtrip_seconds").help("Gateway round-trip latency")
            .labelNames("version", "parser_version")
            .buckets(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5)
            .register();

    public static void main(String[] args) throws Exception {
        new HTTPServer.Builder().withPort(HTTP_PORT).build();      // /metrics + /healthz
        HealthHttp.start(HTTP_PORT + 1, VERSION, REGION);          // tiny /readyz on +1

        EventLoopGroup boss = new NioEventLoopGroup(1);
        EventLoopGroup work = new NioEventLoopGroup();
        try {
            ServerBootstrap b = new ServerBootstrap();
            b.group(boss, work)
             .channel(NioServerSocketChannel.class)
             .option(ChannelOption.SO_BACKLOG, 2048)
             .childOption(ChannelOption.SO_KEEPALIVE, true)
             .childOption(ChannelOption.TCP_NODELAY, true)
             .childHandler(new ChannelInitializer<SocketChannel>() {
                @Override protected void initChannel(SocketChannel ch) {
                    ch.pipeline()
                      // Read-idle 90 s — airline endpoints heartbeat every 60 s
                      .addLast(new IdleStateHandler(90, 0, 0, TimeUnit.SECONDS))
                      .addLast(new LineBasedFrameDecoder(64 * 1024))
                      .addLast(new StringDecoder())
                      .addLast(new StringEncoder())
                      .addLast(new GatewaySessionHandler(VERSION, REGION));
                }
             });
            ChannelFuture f = b.bind(TCP_PORT).sync();
            System.out.printf("gateway-java %s region=%s listening tcp/%d http/%d%n",
                    VERSION, REGION, TCP_PORT, HTTP_PORT);
            f.channel().closeFuture().sync();
        } finally {
            boss.shutdownGracefully();
            work.shutdownGracefully();
        }
    }

    private static String env(String k, String d) {
        String v = System.getenv(k);
        return v == null || v.isBlank() ? d : v;
    }
}
