import type { WebSocketBackingStore } from './WebSocketBackingStore';

/**
 * The connection info for devtools plugins client.
 */
export interface ConnectionInfo {
  /** Indicates the sender towards the devtools plugin. */
  sender:
    | 'app' // client running in the app environment.
    | 'browser'; // client running in the browser environment.

  /** Dev server address. */
  devServer: string;

  /** The plugin name. */
  pluginName: string;

  /**
   * The backing store for the WebSocket connection. Exposed for testing.
   * If not provided, the default singleton instance will be used.
   * @hidden
   */
  wsStore?: WebSocketBackingStore;

  /**
   * The transport protocol version between the app and the webui.
   */
  protocolVersion: number;
}

/**
 * Options for the devtools plugin client.
 */
export interface DevToolsPluginClientOptions {
  /**
   * The underlying WebSocket [`binaryType`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType).
   */
  websocketBinaryType?: 'arraybuffer' | 'blob';
}

/**
 * The handshake messages for the devtools plugin client.
 * @hidden
 */
export interface HandshakeMessageParams {
  protocolVersion: number;
  pluginName: string;
  method: 'handshake' | 'terminateBrowserClient';
  browserClientId: string;
}
