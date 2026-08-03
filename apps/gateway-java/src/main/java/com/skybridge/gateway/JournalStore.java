package com.skybridge.gateway;

interface JournalStore {
    void append(String messageId, String payload, String parserVersion, String region) throws Exception;
}