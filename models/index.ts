import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';

const { models, model } = mongoose;
const m = (name: string, schema: Schema): Model<any> => (models[name] as Model<any>) || model(name, schema);

/* ---------------- użytkownicy ---------------- */
const UserSchema = new Schema(
  {
    discordId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    globalName: String,
    avatar: String,
    email: { type: String, lowercase: true },
    role: { type: String, enum: ['user', 'creator', 'admin'], default: 'user', index: true },
    sellerSlug: { type: String, default: null },
    banned: { type: Boolean, default: false },
    banReason: String,
    newsletter: { type: Boolean, default: false },
    lastLoginAt: Date,
    lastIpHash: String,
    deletionRequestedAt: Date,
  },
  { timestamps: true },
);

/* ---------------- twórcy ---------------- */
const SellerSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    color: { type: String, default: 'linear-gradient(135deg,#4a82ff,#1d4fd8)' },
    official: { type: Boolean, default: false },
    verified: { type: Boolean, default: true },
    bio: { type: String, default: '' },
    since: { type: Number, default: () => new Date().getFullYear() },
    ownerDiscordId: { type: String, index: true },
    sales: { type: Number, default: 0 },
    rating: { type: Number, default: 5 },
    payoutMethod: { type: String, default: '' },
  },
  { timestamps: true },
);

/* ---------------- produkty ---------------- */
const ProductSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    cat: { type: String, required: true, index: true },
    art: { type: String, default: 'shield' },
    seller: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, default: null },
    rating: { type: Number, default: 5 },
    reviewsCount: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    badge: { type: String, default: '' },
    tech: [String],
    compat: { type: String, default: '' },
    type: { type: String, default: '' },
    version: { type: String, default: '1.0.0' },
    desc: { type: String, default: '' },
    longDesc: { type: String, default: '' },
    feats: [String],
    resmon: { type: String, default: null },
    imageUrl: { type: String, default: null },
    // Prywatny adres pliku do pobrania — nigdy nie trafia do przeglądarki.
    downloadUrl: { type: String, default: null, select: false },
    published: { type: Boolean, default: true, index: true },
    changelog: [{ version: String, date: String, notes: [String] }],
  },
  { timestamps: true },
);
ProductSchema.index({ name: 'text', desc: 'text', tech: 'text' });

/* ---------------- zamówienia ---------------- */
const OrderSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    discordId: { type: String, index: true },
    username: String,
    email: String,
    items: [{ productSlug: String, name: String, seller: String, license: String, price: Number }],
    subtotal: Number,
    discount: { type: Number, default: 0 },
    total: Number,
    coupon: { type: String, default: null },
    status: { type: String, enum: ['pending', 'paid', 'refunded', 'cancelled', 'failed'], default: 'pending', index: true },
    provider: { type: String, enum: ['demo', 'stripe'], default: 'demo' },
    providerRef: String,
    paidAt: Date,
    ipHash: String,
    note: String,
  },
  { timestamps: true },
);

/* ---------------- licencje ---------------- */
const LicenseSchema = new Schema(
  {
    // HMAC-SHA256(klucz, LICENSE_PEPPER) — po tym wyszukujemy; klucza jawnego nie trzymamy.
    keyHash: { type: String, required: true, unique: true, index: true },
    // AES-256-GCM — pozwala pokazać klucz właścicielowi w panelu.
    keyEnc: { type: String, required: true },
    keyLast4: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    discordId: { type: String, index: true },
    productSlug: { type: String, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    tier: { type: String, enum: ['std', 'pro', 'net'], default: 'std' },
    maxServers: { type: Number, default: 1 },
    servers: [{ id: String, label: String, boundAt: Date, lastSeenAt: Date }],
    status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
    unbindsThisMonth: { type: Number, default: 0 },
    unbindsMonth: { type: String, default: '' },
    updatesUntil: { type: Date, default: null },
    lastCheckAt: Date,
    checks: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/* ---------------- kupony ---------------- */
const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    pct: { type: Number, required: true, min: 1, max: 90 },
    plat: { type: String, default: null },
    sellerSlug: { type: String, default: null },
    maxUses: { type: Number, default: 0 }, // 0 = bez limitu
    uses: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/* ---------------- opinie ---------------- */
const ReviewSchema = new Schema(
  {
    productSlug: { type: String, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    username: String,
    rating: { type: Number, min: 1, max: 5 },
    text: String,
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);
ReviewSchema.index({ productSlug: 1, userId: 1 }, { unique: true });

/* ---------------- tickety ---------------- */
const TicketSchema = new Schema(
  {
    number: { type: Number, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    discordId: String,
    username: String,
    subject: String,
    category: String,
    status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open', index: true },
    messages: [{ staff: Boolean, author: String, body: String, at: Date }],
  },
  { timestamps: true },
);

/* ---------------- formularze ---------------- */
const ContactSchema = new Schema(
  {
    name: String,
    email: String,
    topic: String,
    message: String,
    ipHash: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const SubscriberSchema = new Schema(
  {
    email: { type: String, unique: true, lowercase: true },
    tokenHash: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    discordId: String,
    username: String,
    studio: String,
    plat: String,
    portfolio: String,
    about: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    note: String,
  },
  { timestamps: true },
);

/* ---------------- infrastruktura ---------------- */
const RateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuditSchema = new Schema(
  {
    actor: String,
    actorId: String,
    action: { type: String, index: true },
    target: String,
    meta: Schema.Types.Mixed,
  },
  { timestamps: true },
);

const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

export const User = m('User', UserSchema);
export const Seller = m('Seller', SellerSchema);
export const Product = m('Product', ProductSchema);
export const Order = m('Order', OrderSchema);
export const License = m('License', LicenseSchema);
export const Coupon = m('Coupon', CouponSchema);
export const Review = m('Review', ReviewSchema);
export const Ticket = m('Ticket', TicketSchema);
export const Contact = m('Contact', ContactSchema);
export const Subscriber = m('Subscriber', SubscriberSchema);
export const Application = m('Application', ApplicationSchema);
export const RateLimit = m('RateLimit', RateLimitSchema);
export const Audit = m('Audit', AuditSchema);
export const Counter = m('Counter', CounterSchema);

export async function nextSeq(name: string): Promise<number> {
  const r = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean<any>();
  return r.seq;
}
