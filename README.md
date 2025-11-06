# Hyper Payment Bridge Node Server

Node.js hyper ödeme köprüsü sunucusu.

## Güvenlik Uyarısı

**ÖNEMLİ:** Bu uygulama mutlaka bir ara köprü üzerinden çağrılmalıdır. Doğrudan herkese açık bir URL ile paylaşılmamalıdır. Ödeme bilgileri ve API anahtarları gibi hassas veriler içerdiğinden, güvenlik önlemleri alınmadan internete açılması güvenlik riskleri oluşturur.
Ayrıca pay endpointi spam saldırısyla kötü amaçlı kullanılabilir bu yüzden önerilen kullanımı uygulayın.

**Önerilen Kullanım:**
- Ayrı bir web sunucusu üzerinden pay endpointini çağırın
- Firewall kuralları ile sadece belirli IP adreslerinden erişime izin verin
- SSL/TLS sertifikası kullanın
- API Key ve diğer hassas bilgileri `.env` dosyasında saklayın

## Kurulum

```bash
git clone https://github.com/seukaiwokeo/hpb_node.git
cd hpb_node
npm install
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_DATABASE=account

HYPER_API_BASE=api.example.com
HYPER_API_KEY=your_api_key_here

APP_NAME=HPB Node ## Oyun isminizi girin
APP_URL=https://hpb.example.com

LOG_LEVEL=info
```

### Veritabanı tablolarını oluştur

#### MySQL

```sql

-- pb_products tablosu
create table pb_products
(
    product_id    bigint auto_increment primary key,
    product_name  varchar(255)                       not null,  -- ürün adı
    product_image varchar(255)                       null,      -- ürün görseli ödeme ekranında gözükür
    price         decimal(13, 2)                     not null,  -- ürün fiyatı
    game_value    int                                not null,  -- müşteriye verilecek oyun parası miktarı
    created_at    datetime default CURRENT_TIMESTAMP not null,
    status        tinyint  default 1                 not null
);

create index pb_products_created_at_index on pb_products (created_at);
create index pb_products_product_name_index on pb_products (product_name);
create index pb_products_status_index on pb_products (status);

-- pb_payments tablosu
create table pb_payments
(
    payment_id      bigint auto_increment primary key,
    payment_link_id int                                not null,
    payment_link    varchar(255)                       not null,
    payment_guid    varchar(255)                       not null,
    account_id      varchar(255)                       not null,
    user_id         varchar(255)                       null,
    product_id      bigint                             not null,
    amount          decimal(13, 2)                     not null,
    created_at      datetime default CURRENT_TIMESTAMP not null,
    status          tinyint  default 0                 not null
);

create index pb_payments_account_id_index on pb_payments (account_id);
create index pb_payments_user_id_index on pb_payments (user_id);
create index pb_payments_created_at_index on pb_payments (created_at);
create index pb_payments_payment_guid_index on pb_payments (payment_guid);
create index pb_payments_payment_link_id_index on pb_payments (payment_link_id);
create index pb_payments_payment_link_id_status_index on pb_payments (payment_link_id, status);
create index pb_payments_product_id_index on pb_payments (product_id);
create index pb_payments_status_index on pb_payments (status);

-- pb_process_queue
-- ödemeler onaylandıktan sonra işlem sırasına yani pb_process_queue tablosuna is_processed 0 olarak eklenir.
-- özel bir yazılımla veya projenin devamında is_processed değeri 0 olan işlemeri belli aralıklarla alıp oyun paralarını teslim edip 1 değerine çevirebilirsiniz.

create table pb_process_queue
(
    process_queue_id bigint auto_increment primary key,
    payment_id       bigint                             not null,
    account_id       varchar(255)                       not null,
    user_id          varchar(255)                       null,
    game_value       decimal(13, 2)                     not null,
    created_at       datetime default CURRENT_TIMESTAMP not null,
    is_processed     tinyint  default 0                 not null
);

create index pb_process_queue_account_id_index on pb_process_queue (account_id);
create index pb_process_queue_created_at_index on pb_process_queue (created_at);
create index pb_process_queue_is_processed_index on pb_process_queue (is_processed);
create index pb_process_queue_payment_id_index on pb_process_queue (payment_id);
create index pb_process_queue_user_id_index on pb_process_queue (user_id);
```

#### MSSQL (SQL Server)

```sql

-- pb_products tablosu
CREATE TABLE pb_products
(
    product_id    BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_name  NVARCHAR(255)                  NOT NULL,  -- ürün adı
    product_image NVARCHAR(255)                  NULL,      -- ürün görseli ödeme ekranında gözükür
    price         DECIMAL(13, 2)                 NOT NULL,  -- ürün fiyatı
    game_value    INT                            NOT NULL,  -- müşteriye verilecek oyun parası miktarı
    created_at    DATETIME DEFAULT GETDATE()     NOT NULL,
    status        TINYINT  DEFAULT 1             NOT NULL
);

CREATE INDEX pb_products_created_at_index ON pb_products (created_at);
CREATE INDEX pb_products_product_name_index ON pb_products (product_name);
CREATE INDEX pb_products_status_index ON pb_products (status);

-- pb_payments tablosu
CREATE TABLE pb_payments
(
    payment_id      BIGINT IDENTITY(1,1) PRIMARY KEY,
    payment_link_id INT                            NOT NULL,
    payment_link    NVARCHAR(255)                  NOT NULL,
    payment_guid    NVARCHAR(255)                  NOT NULL,
    account_id      NVARCHAR(255)                  NOT NULL,
    user_id         NVARCHAR(255)                  NULL,
    product_id      BIGINT                         NOT NULL,
    amount          DECIMAL(13, 2)                 NOT NULL,
    created_at      DATETIME DEFAULT GETDATE()     NOT NULL,
    status          TINYINT  DEFAULT 0             NOT NULL
);

CREATE INDEX pb_payments_account_id_index ON pb_payments (account_id);
CREATE INDEX pb_payments_user_id_index ON pb_payments (user_id);
CREATE INDEX pb_payments_created_at_index ON pb_payments (created_at);
CREATE INDEX pb_payments_payment_guid_index ON pb_payments (payment_guid);
CREATE INDEX pb_payments_payment_link_id_index ON pb_payments (payment_link_id);
CREATE INDEX pb_payments_payment_link_id_status_index ON pb_payments (payment_link_id, status);
CREATE INDEX pb_payments_product_id_index ON pb_payments (product_id);
CREATE INDEX pb_payments_status_index ON pb_payments (status);

-- pb_process_queue
-- ödemeler onaylandıktan sonra işlem sırasına yani pb_process_queue tablosuna is_processed 0 olarak eklenir.
-- özel bir yazılımla veya projenin devamında is_processed değeri 0 olan işlemeri belli aralıklarla alıp oyun paralarını teslim edip 1 değerine çevirebilirsiniz.

CREATE TABLE pb_process_queue
(
    process_queue_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    payment_id       BIGINT                         NOT NULL,
    account_id       NVARCHAR(255)                  NOT NULL,
    user_id          NVARCHAR(255)                  NULL,
    game_value       DECIMAL(13, 2)                 NOT NULL,
    created_at       DATETIME DEFAULT GETDATE()     NOT NULL,
    is_processed     TINYINT  DEFAULT 0             NOT NULL
);

CREATE INDEX pb_process_queue_account_id_index ON pb_process_queue (account_id);
CREATE INDEX pb_process_queue_created_at_index ON pb_process_queue (created_at);
CREATE INDEX pb_process_queue_is_processed_index ON pb_process_queue (is_processed);
CREATE INDEX pb_process_queue_payment_id_index ON pb_process_queue (payment_id);
CREATE INDEX pb_process_queue_user_id_index ON pb_process_queue (user_id);
```

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## API Endpoints

### 1. Health Check
```
GET /api/health
```

### 2. Ödeme Linki Oluştur
```
POST /api/pay

Body:
{
    "account_id": "12345",
    "user_id": "12345", // zorunlu değil
    "productid": "1",
    "callback": "optional_callback_function" -- jsonp kullananlar için (zorunlu değil)
}

Response:
{
    "data": {
        "paymentLinkID": 1,
        "paymentUrl": "https://www.example.com/hizli-ode/hash?iFrame=1",
        "paymentGuid": "hash"
    },
    "success": true,
    "message": "Ödeme isteği oluşturuldu.",
    "errorCode": null
}
```

### 3. Ödeme Callback
Bu endpoint hyper tarafından ödeme işlemi sonuçlandığında çağrılır ödemenin callback endpointidir bu yüzden ApiKey eşleşmesine bakılır dışarıdan biri çağıramaz. Gerekirse IP kısıtlaması önerilir.
```
POST /api/notify
```
