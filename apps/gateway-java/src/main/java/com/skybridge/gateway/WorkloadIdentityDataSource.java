package com.skybridge.gateway;

import com.azure.core.credential.TokenRequestContext;
import com.azure.identity.DefaultAzureCredential;
import com.azure.identity.DefaultAzureCredentialBuilder;
import org.postgresql.ds.PGSimpleDataSource;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.util.logging.Logger;

final class WorkloadIdentityDataSource implements DataSource {
    private static final String POSTGRES_SCOPE = "https://ossrdbms-aad.database.windows.net/.default";
    private final PGSimpleDataSource delegate;
    private final DefaultAzureCredential credential;
    private final String user;
    private final String password;

    WorkloadIdentityDataSource(String host, int port, String database, String user, String password) {
        delegate = new PGSimpleDataSource();
        delegate.setServerNames(new String[]{host});
        delegate.setPortNumbers(new int[]{port});
        delegate.setDatabaseName(database);
        delegate.setSslMode("require");
        this.user = user;
        this.password = password;
        credential = password == null ? new DefaultAzureCredentialBuilder().build() : null;
    }

    @Override
    public Connection getConnection() throws SQLException {
        String accessToken = password;
        if (accessToken == null) {
            accessToken = credential.getToken(new TokenRequestContext().addScopes(POSTGRES_SCOPE)).block().getToken();
        }
        return delegate.getConnection(user, accessToken);
    }

    @Override public Connection getConnection(String username, String password) throws SQLException { return delegate.getConnection(username, password); }
    @Override public PrintWriter getLogWriter() throws SQLException { return delegate.getLogWriter(); }
    @Override public void setLogWriter(PrintWriter out) throws SQLException { delegate.setLogWriter(out); }
    @Override public void setLoginTimeout(int seconds) throws SQLException { delegate.setLoginTimeout(seconds); }
    @Override public int getLoginTimeout() throws SQLException { return delegate.getLoginTimeout(); }
    @Override public Logger getParentLogger() throws SQLFeatureNotSupportedException { return delegate.getParentLogger(); }
    @Override public <T> T unwrap(Class<T> iface) throws SQLException { return delegate.unwrap(iface); }
    @Override public boolean isWrapperFor(Class<?> iface) throws SQLException { return delegate.isWrapperFor(iface); }
}