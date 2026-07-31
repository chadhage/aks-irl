// Skybridge Type B / EDIFACT message parser — workshop edition.
//
// Why C++: this is the workhorse of the legacy stack and the part the customer
// is *not* willing to rewrite for the MVP. We lift it into a container with no
// source changes beyond a clean CMake build and a tiny libmicrohttpd HTTP
// shim — the gateway POSTs each envelope here and reads back a decoded
// summary line.
//
// The two cohorts the workshop A/Bs between live in DECODE_V1 / DECODE_V2.

#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <microhttpd.h>
#include <sstream>
#include <string>
#include <thread>

static const char* APP_VERSION = std::getenv("APP_VERSION") ? std::getenv("APP_VERSION") : "v1";
static const int   HTTP_PORT   = std::atoi(std::getenv("PARSER_HTTP_PORT") ?: "9100");
static const int   METRICS_PORT= std::atoi(std::getenv("PARSER_METRICS_PORT") ?: "9090");

static std::atomic<uint64_t> g_decoded{0};
static std::atomic<uint64_t> g_failed{0};

// Trivial decoder — splits the envelope on '/', mimics the Type B header
// fields (priority, destination, origin, smi/bid). Returns a one-line summary.
static std::string decode_v1(const std::string& env) {
    std::stringstream out;
    out << "v1 fields=";
    size_t prev = 0, n = 0;
    for (size_t i = 0; i <= env.size(); ++i) {
        if (i == env.size() || env[i] == '/') {
            ++n; prev = i + 1;
        }
    }
    out << n;
    return out.str();
}

// v2 adds a synthetic "priority" tag, used by Module 04 to prove the A/B
// works end-to-end.
static std::string decode_v2(const std::string& env) {
    return decode_v1(env) + " priority=QU";
}

static enum MHD_Result handle(void* /*cls*/, struct MHD_Connection* c,
                              const char* url, const char* method,
                              const char* /*version*/, const char* upload,
                              size_t* upload_size, void** ptr) {
    static int marker;
    if (*ptr == nullptr) { *ptr = &marker; return MHD_YES; }

    if (std::strcmp(url, "/healthz") == 0 || std::strcmp(url, "/readyz") == 0) {
        const char* body = "{\"ok\":true}";
        auto* resp = MHD_create_response_from_buffer(strlen(body), (void*)body,
                                                     MHD_RESPMEM_PERSISTENT);
        MHD_add_response_header(resp, "Content-Type", "application/json");
        int r = MHD_queue_response(c, MHD_HTTP_OK, resp);
        MHD_destroy_response(resp);
        return (enum MHD_Result)r;
    }
    if (std::strcmp(url, "/decode") != 0 || std::strcmp(method, "POST") != 0) {
        const char* nf = "not found";
        auto* resp = MHD_create_response_from_buffer(strlen(nf), (void*)nf, MHD_RESPMEM_PERSISTENT);
        int r = MHD_queue_response(c, 404, resp);
        MHD_destroy_response(resp);
        return (enum MHD_Result)r;
    }

    static thread_local std::string body;
    if (*upload_size != 0) { body.append(upload, *upload_size); *upload_size = 0; return MHD_YES; }

    std::string decoded;
    try {
        decoded = (std::string(APP_VERSION).rfind("v2", 0) == 0) ? decode_v2(body) : decode_v1(body);
        ++g_decoded;
    } catch (...) {
        decoded = "ERR";
        ++g_failed;
    }
    body.clear();

    auto* resp = MHD_create_response_from_buffer(decoded.size(),
                                                 (void*)decoded.data(),
                                                 MHD_RESPMEM_MUST_COPY);
    MHD_add_response_header(resp, "x-parser-version", APP_VERSION);
    int r = MHD_queue_response(c, MHD_HTTP_OK, resp);
    MHD_destroy_response(resp);
    return (enum MHD_Result)r;
}

// Tiny /metrics endpoint on a second port — Prometheus text format.
static enum MHD_Result metrics(void*, struct MHD_Connection* c,
                               const char*, const char*, const char*,
                               const char*, size_t*, void**) {
    char buf[512];
    int n = std::snprintf(buf, sizeof(buf),
        "# TYPE parser_decoded_total counter\n"
        "parser_decoded_total{version=\"%s\"} %lu\n"
        "# TYPE parser_failed_total counter\n"
        "parser_failed_total{version=\"%s\"} %lu\n",
        APP_VERSION, (unsigned long)g_decoded.load(),
        APP_VERSION, (unsigned long)g_failed.load());
    auto* r = MHD_create_response_from_buffer(n, buf, MHD_RESPMEM_MUST_COPY);
    int rc = MHD_queue_response(c, 200, r);
    MHD_destroy_response(r);
    return (enum MHD_Result)rc;
}

int main() {
    auto* d1 = MHD_start_daemon(MHD_USE_INTERNAL_POLLING_THREAD | MHD_USE_THREAD_PER_CONNECTION,
                                HTTP_PORT, nullptr, nullptr, &handle, nullptr, MHD_OPTION_END);
    auto* d2 = MHD_start_daemon(MHD_USE_INTERNAL_POLLING_THREAD,
                                METRICS_PORT, nullptr, nullptr, &metrics, nullptr, MHD_OPTION_END);
    if (!d1 || !d2) { std::fprintf(stderr, "failed to bind\n"); return 1; }
    std::printf("parser-cpp %s listening decode:%d metrics:%d\n", APP_VERSION, HTTP_PORT, METRICS_PORT);

    // Park forever — SIGTERM from Kubernetes will end us.
    while (true) std::this_thread::sleep_for(std::chrono::seconds(60));
    MHD_stop_daemon(d1);
    MHD_stop_daemon(d2);
    return 0;
}
