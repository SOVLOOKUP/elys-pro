// Generate from https://docs.rs/opendal/latest/opendal/services/
export interface AzblobConfig {
    root?: string;
    container: string;
    endpoint?: string;
    account_name?: string;
    account_key?: string;
    encryption_key?: string;
    encryption_key_sha256?: string;
    encryption_algorithm?: string;
    sas_token?: string;
    batch_max_operations?: number;
}

export interface AzdlsConfig {
    root?: string;
    filesystem: string;
    endpoint?: string;
    account_name?: string;
    account_key?: string;
    client_secret?: string;
    tenant_id?: string;
    client_id?: string;
    sas_token?: string;
    authority_host?: string;
}

export interface CosConfig {
    root?: string;
    endpoint?: string;
    secret_id?: string;
    secret_key?: string;
    bucket?: string;
    enable_versioning: boolean;
    disable_config_load: boolean;
}

export interface FsConfig {
    root?: string;
    atomic_write_dir?: string;
}

export interface GcsConfig {
    root?: string;
    bucket: string;
    endpoint?: string;
    scope?: string;
    service_account?: string;
    credential?: string;
    credential_path?: string;
    predefined_acl?: string;
    default_storage_class?: string;
    allow_anonymous: boolean;
    disable_vm_metadata: boolean;
    disable_config_load: boolean;
    token?: string;
}

export interface GhacConfig {
    root?: string;
    version?: string;
    endpoint?: string;
    runtime_token?: string;
}

export interface HttpConfig {
    endpoint?: string;
    username?: string;
    password?: string;
    token?: string;
    root?: string;
}

export interface IpmfsConfig {
    root?: string;
    endpoint?: string;
}

export interface MemoryConfig {
    root?: string;
}

export interface ObsConfig {
    root?: string;
    endpoint?: string;
    access_key_id?: string;
    secret_access_key?: string;
    bucket?: string;
    enable_versioning: boolean;
}

export interface OssConfig {
    root?: string;
    endpoint?: string;
    presign_endpoint?: string;
    bucket: string;
    addressing_style?: string;
    presign_addressing_style?: string;
    enable_versioning: boolean;
    server_side_encryption?: string;
    server_side_encryption_key_id?: string;
    allow_anonymous: boolean;
    access_key_id?: string;
    access_key_secret?: string;
    security_token?: string;
    batch_max_operations?: number;
    delete_max_size?: number;
    role_arn?: string;
    role_session_name?: string;
    oidc_provider_arn?: string;
    oidc_token_file?: string;
    sts_endpoint?: string;
}

export interface S3Config {
    root?: string;
    bucket: string;
    enable_versioning: boolean;
    endpoint?: string;
    region?: string;
    access_key_id?: string;
    secret_access_key?: string;
    session_token?: string;
    role_arn?: string;
    external_id?: string;
    role_session_name?: string;
    disable_config_load: boolean;
    disable_ec2_metadata: boolean;
    allow_anonymous: boolean;
    server_side_encryption?: string;
    server_side_encryption_aws_kms_key_id?: string;
    server_side_encryption_customer_algorithm?: string;
    server_side_encryption_customer_key?: string;
    server_side_encryption_customer_key_md5?: string;
    default_storage_class?: string;
    enable_virtual_host_style: boolean;
    batch_max_operations?: number;
    delete_max_size?: number;
    disable_stat_with_override: boolean;
    checksum_algorithm?: string;
    disable_write_with_if_match: boolean;
    enable_write_with_append: boolean;
    disable_list_objects_v2: boolean;
    enable_request_payer: boolean;
}

export interface WebdavConfig {
    endpoint?: string;
    username?: string;
    password?: string;
    token?: string;
    root?: string;
    disable_copy: boolean;
}

export interface WebhdfsConfig {
    root?: string;
    endpoint?: string;
    user_name?: string;
    delegation?: string;
    disable_list_batch: boolean;
    atomic_write_dir?: string;
}

export interface AliyunDriveConfig {
    root?: string;
    access_token?: string;
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
    drive_type: string;
}

export interface CacacheConfig {
    datadir?: string;
}

export interface DashmapConfig {
    root?: string;
}

export interface DropboxConfig {
    root?: string;
    access_token?: string;
    refresh_token?: string;
    client_id?: string;
    client_secret?: string;
}

export interface EtcdConfig {
    endpoints?: string;
    username?: string;
    password?: string;
    root?: string;
    ca_path?: string;
    cert_path?: string;
    key_path?: string;
}

export interface GdriveConfig {
    root?: string;
    access_token?: string;
    refresh_token?: string;
    client_id?: string;
    client_secret?: string;
}

export interface HuggingfaceConfig {
    repo_type?: string;
    repo_id?: string;
    revision?: string;
    root?: string;
    token?: string;
}

export interface IpfsConfig {
    endpoint?: string;
    root?: string;
}

export interface MemcachedConfig {
    endpoint?: string;
    root?: string;
    username?: string;
    password?: string;
    default_ttl?: number;
    connection_pool_max_size?: number;
}

export interface MiniMokaConfig {
    max_capacity?: number;
    time_to_live?: string;
    time_to_idle?: string;
    root?: string;
}

export interface MokaConfig {
    name?: string;
    max_capacity?: number;
    time_to_live?: string;
    time_to_idle?: string;
    root?: string;
}

export interface OnedriveConfig {
    root?: string;
    access_token?: string;
    refresh_token?: string;
    client_id?: string;
    client_secret?: string;
    enable_versioning: boolean;
}

export interface PersyConfig {
    datafile?: string;
    segment?: string;
    index?: string;
}

export interface PostgresqlConfig {
    root?: string;
    connection_string?: string;
    table?: string;
    key_field?: string;
    value_field?: string;
}

export interface KoofrConfig {
    root?: string;
    endpoint: string;
    email: string;
    password?: string;
}

export interface MysqlConfig {
    connection_string?: string;
    table?: string;
    key_field?: string;
    value_field?: string;
    root?: string;
}

export interface RedbConfig {
    datadir?: string;
    table?: string;
    root?: string;
}

export interface RedisConfig {
    endpoint?: string;
    cluster_endpoints?: string;
    connection_pool_max_size?: number;
    username?: string;
    password?: string;
    root?: string;
    db: number;
    default_ttl?: number;
}

export interface SledConfig {
    datadir?: string;
    tree?: string;
    root?: string;
}

export interface TikvConfig {
    endpoints?: string[];
    insecure: boolean;
    ca_path?: string;
    cert_path?: string;
    key_path?: string;
}

export interface VercelArtifactsConfig {
    access_token?: string;
}

export interface MongodbConfig {
    connection_string?: string;
    database?: string;
    collection?: string;
    root?: string;
    key_field?: string;
    value_field?: string;
}

export interface GridfsConfig {
    connection_string?: string;
    database?: string;
    bucket?: string;
    chunk_size?: number;
    root?: string;
}

export interface SqliteConfig {
    connection_string?: string;
    table?: string;
    key_field?: string;
    value_field?: string;
    root?: string;
}

export interface AzfileConfig {
    root?: string;
    endpoint?: string;
    share_name: string;
    account_name?: string;
    account_key?: string;
    sas_token?: string;
}

export interface SwiftConfig {
    endpoint?: string;
    container?: string;
    root?: string;
    token?: string;
}

export interface AlluxioConfig {
    root?: string;
    endpoint?: string;
}

export interface B2Config {
    root?: string;
    application_key_id?: string;
    application_key?: string;
    bucket: string;
    bucket_id: string;
}

export interface SeafileConfig {
    root?: string;
    endpoint?: string;
    username?: string;
    password?: string;
    repo_name: string;
}

export interface UpyunConfig {
    root?: string;
    bucket: string;
    operator?: string;
    password?: string;
}

export interface YandexDiskConfig {
    root?: string;
    access_token: string;
}

export type OpendalOption = 
  | AzblobConfig
  | AzdlsConfig
  | CosConfig
  | FsConfig
  | GcsConfig
  | GhacConfig
  | HttpConfig
  | IpmfsConfig
  | MemoryConfig
  | ObsConfig
  | OssConfig
  | S3Config
  | WebdavConfig
  | WebhdfsConfig
  | AliyunDriveConfig
  | CacacheConfig
  | DashmapConfig
  | DropboxConfig
  | EtcdConfig
  | GdriveConfig
  | HuggingfaceConfig
  | IpfsConfig
  | MemcachedConfig
  | MiniMokaConfig
  | MokaConfig
  | OnedriveConfig
  | PersyConfig
  | PostgresqlConfig
  | KoofrConfig
  | MysqlConfig
  | RedbConfig
  | RedisConfig
  | SledConfig
  | TikvConfig
  | VercelArtifactsConfig
  | MongodbConfig
  | GridfsConfig
  | SqliteConfig
  | AzfileConfig
  | SwiftConfig
  | AlluxioConfig
  | B2Config
  | SeafileConfig
  | UpyunConfig
  | YandexDiskConfig;