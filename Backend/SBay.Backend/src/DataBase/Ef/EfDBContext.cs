using Microsoft.EntityFrameworkCore;
using SBay.Backend.DataBase.Configurations;
using SBay.Domain.Database.Configurations;
using Message = SBay.Backend.Messaging.Message;
using CartItem = SBay.Domain.Entities.CartItem;
using Listing = SBay.Domain.Entities.Listing;
using Money = SBay.Domain.ValueObjects.Money;
using ShoppingCart = SBay.Domain.Entities.ShoppingCart;
using User = SBay.Domain.Entities.User;
using Category = SBay.Domain.Entities.Category;
using Address = SBay.Domain.Entities.Address;
using FavoriteListing = SBay.Domain.Entities.FavoriteListing;
using Review = SBay.Domain.Entities.Review;
using ReviewHelpful = SBay.Domain.Entities.ReviewHelpful;
using PushToken = SBay.Domain.Entities.PushToken;
using Report = SBay.Domain.Entities.Report;
using UserBlock = SBay.Domain.Entities.UserBlock;
using PaymentTransaction = SBay.Domain.Entities.PaymentTransaction;
using ListingBoostPurchase = SBay.Domain.Entities.ListingBoostPurchase;
using PlatformFee = SBay.Domain.Entities.PlatformFee;
using SponsoredAd = SBay.Domain.Entities.SponsoredAd;

namespace SBay.Domain.Database
{
    public class EfDbContext : DbContext
    {
        public EfDbContext(DbContextOptions<EfDbContext> options)
            : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Listing> Listings => Set<Listing>();
        public DbSet<ShoppingCart> Carts => Set<ShoppingCart>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Message> Messages => Set<Message>();
        public DbSet<Address> Addresses => Set<Address>();
        public DbSet<FavoriteListing> Favorites => Set<FavoriteListing>();
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<ReviewHelpful> ReviewHelpfuls => Set<ReviewHelpful>();
        public DbSet<PushToken> PushTokens => Set<PushToken>();
        public DbSet<Report> Reports => Set<Report>();
        public DbSet<UserBlock> UserBlocks => Set<UserBlock>();
        public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
        public DbSet<ListingBoostPurchase> ListingBoostPurchases => Set<ListingBoostPurchase>();
        public DbSet<PlatformFee> PlatformFees => Set<PlatformFee>();
        public DbSet<SponsoredAd> SponsoredAds => Set<SponsoredAd>();
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Owned<Money>();

            modelBuilder.Entity<User>(e =>
            {
                e.ToTable("users");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id");

                e.Property(x => x.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
                e.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
                e.Property(x => x.DisplayName).HasColumnName("display_name");
                e.Property(x => x.Phone).HasColumnName("phone");
                e.Property(x => x.City).HasColumnName("city");
                e.Property(x => x.AvatarUrl).HasColumnName("avatar_url");
                e.Property(x => x.Role).HasColumnName("role");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").ValueGeneratedOnAdd();
                e.Property(x => x.LastSeen).HasColumnName("last_seen");
                e.Property(x => x.IsSeller).HasColumnName("is_seller").HasDefaultValue(true);
                e.Property(x => x.TotalRevenue)
                    .HasColumnName("total_revenue")
                    .HasColumnType("numeric(12,2)")
                    .HasDefaultValue(0);
                e.Property(x => x.TotalOrders)
                    .HasColumnName("total_orders")
                    .HasDefaultValue(0);
                e.Property(x => x.PendingOrders)
                    .HasColumnName("pending_orders")
                    .HasDefaultValue(0);
                e.Property(x => x.ReviewCount)
                    .HasColumnName("review_count")
                    .HasDefaultValue(0);
                e.Property(x => x.Rating)
                    .HasColumnName("average_rating")
                    .HasColumnType("numeric(3,2)")
                    .HasDefaultValue(0);
                e.Property(x => x.ListingBanned)
                    .HasColumnName("listing_banned")
                    .HasDefaultValue(false);
                e.Property(x => x.ListingBanUntil)
                    .HasColumnName("listing_ban_until");
                e.Property(x => x.ListingLimit)
                    .HasColumnName("listing_limit");
                e.Property(x => x.ListingLimitCount)
                    .HasColumnName("listing_limit_count")
                    .HasDefaultValue(0);
                e.Property(x => x.ListingLimitResetAt)
                    .HasColumnName("listing_limit_reset_at");
                e.HasIndex(x => x.Email).IsUnique();
                e.Ignore(x => x.ExternalId);
                e.Ignore(x => x.Region);
                e.Ignore(x => x.UserName);
                e.Ignore(x => x.Cart);
                e.Ignore(x => x.Listings);
                e.Ignore(x => x.ShoppingLists);
            });
            modelBuilder.Entity<User>()
                .Property(x => x.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .ValueGeneratedOnAdd();
            modelBuilder.Entity<Message>(e =>
            {
                e.HasKey(m => m.Id);
                e.HasIndex(m => new { m.SenderId, m.ReceiverId });
                e.Property(m => m.Content).IsRequired();

                e.HasOne(m => m.Chat)
                    .WithMany(c => c.Messages)
                    .HasForeignKey(m => m.ChatId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(m => m.SenderId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(m => m.ReceiverId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne<Listing>()
                    .WithMany()
                    .HasForeignKey(m => m.ListingId)
                    .OnDelete(DeleteBehavior.SetNull);
            });
            modelBuilder.Entity<PushToken>(e =>
            {
                e.ToTable("push_tokens");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id");
                e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
                e.Property(x => x.Token).HasColumnName("token").IsRequired();
                e.Property(x => x.Platform).HasColumnName("platform");
                e.Property(x => x.DeviceId).HasColumnName("device_id");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").ValueGeneratedOnAdd();
                e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
                e.HasIndex(x => x.Token).IsUnique();
                e.HasIndex(x => x.UserId);
            });
            modelBuilder.Entity<Report>(e =>
            {
                e.ToTable("reports");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id");
                e.Property(x => x.ReporterId).HasColumnName("reporter_id").IsRequired();
                e.Property(x => x.ReportedUserId).HasColumnName("reported_user_id");
                e.Property(x => x.TargetType).HasColumnName("target_type").HasConversion<string>();
                e.Property(x => x.TargetId).HasColumnName("target_id").IsRequired();
                e.Property(x => x.Reason).HasColumnName("reason").HasConversion<string>();
                e.Property(x => x.Description).HasColumnName("description");
                e.Property(x => x.EvidenceUrls).HasColumnName("evidence_urls").HasColumnType("text[]");
                e.Property(x => x.BlockRequested).HasColumnName("block_requested");
                e.Property(x => x.Status).HasColumnName("status").HasConversion<string>();
                e.Property(x => x.Action).HasColumnName("action").HasConversion<string>();
                e.Property(x => x.ReviewedById).HasColumnName("reviewed_by_id");
                e.Property(x => x.ReviewedAt).HasColumnName("reviewed_at");
                e.Property(x => x.AdminNotes).HasColumnName("admin_notes");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").ValueGeneratedOnAdd();
                e.HasIndex(x => x.ReportedUserId);
                e.HasIndex(x => x.TargetId);
                e.HasIndex(x => x.Status);
            });
            modelBuilder.Entity<UserBlock>(e =>
            {
                e.ToTable("user_blocks");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id");
                e.Property(x => x.BlockerId).HasColumnName("blocker_id").IsRequired();
                e.Property(x => x.BlockedUserId).HasColumnName("blocked_user_id").IsRequired();
                e.Property(x => x.CreatedAt).HasColumnName("created_at").ValueGeneratedOnAdd();
                e.HasIndex(x => new { x.BlockerId, x.BlockedUserId }).IsUnique();
                e.HasIndex(x => x.BlockedUserId);
            });
            modelBuilder.Entity<FavoriteListing>(e =>
            {
                e.ToTable("favorites");
                e.HasKey(x => new { x.UserId, x.ListingId });
                e.Property(x => x.UserId).HasColumnName("user_id");
                e.Property(x => x.ListingId).HasColumnName("listing_id");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
                e.HasIndex(x => new { x.UserId, x.CreatedAt }).HasDatabaseName("idx_favorites_user_time");
                e.HasOne<Listing>()
                    .WithMany()
                    .HasForeignKey(x => x.ListingId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            modelBuilder.Entity<Category>(e =>
            {
                e.ToTable("categories");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id");

                e.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();

                e.HasIndex(x => x.Name).IsUnique();
            });
            modelBuilder.Entity<ShoppingCart>(e =>
            {
                e.ToTable("carts");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id");

                e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
                e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
                e.Ignore(x => x.Items);
                e.Ignore(x => x.Subtotal);
                e.Ignore(x => x.Currency);

                e.HasIndex(x => x.UserId).IsUnique();

                e.OwnsMany<CartItem>(
                    "_items",
                    b =>
                    {
                        b.ToTable("cart_items");

                        b.WithOwner().HasForeignKey("cart_id");
                        b.Property<Guid>("cart_id").HasColumnName("cart_id");

                        b.Property<Guid>("listing_id").HasColumnName("listing_id").IsRequired();
                        b.Property<int>("quantity").HasColumnName("quantity").IsRequired();
                        b.OwnsOne(
                            ci => ci.UnitPrice,
                            m =>
                            {
                                m.Property(x => x.Amount)
                                    .HasColumnName("price_at_added")
                                    .HasColumnType("numeric(12,2)");
                                m.Property(x => x.Currency)
                                    .HasColumnName("currency")
                                    .HasMaxLength(8);
                            }
                        );

                        b.HasKey("cart_id", "listing_id");

                        b.Ignore("TotalPrice");
                    }
                );
            });

            modelBuilder.Entity<PushToken>()
                .Property(x => x.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .ValueGeneratedOnAdd();
            modelBuilder.Entity<Report>()
                .Property(x => x.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .ValueGeneratedOnAdd();
            modelBuilder.Entity<UserBlock>()
                .Property(x => x.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<PaymentTransaction>(e =>
            {
                e.ToTable("payment_transactions");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()").ValueGeneratedOnAdd();
                e.Property(x => x.UserId).HasColumnName("user_id");
                e.Property(x => x.ListingId).HasColumnName("listing_id");
                e.Property(x => x.OrderId).HasColumnName("order_id");
                e.Property(x => x.Provider).HasColumnName("provider").HasMaxLength(64).IsRequired();
                e.Property(x => x.ProviderReference).HasColumnName("provider_reference").HasMaxLength(256);
                e.Property(x => x.Purpose).HasColumnName("purpose").HasConversion<string>().HasMaxLength(64);
                e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(64);
                e.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(12,2)");
                e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(8);
                e.Property(x => x.MetadataJson).HasColumnName("metadata_json").HasColumnType("jsonb");
                e.Property(x => x.CheckoutUrl).HasColumnName("checkout_url");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
                e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
                e.HasIndex(x => new { x.Provider, x.ProviderReference }).IsUnique().HasFilter("provider_reference IS NOT NULL");
                e.HasIndex(x => x.UserId);
                e.HasIndex(x => x.Status);
            });

            modelBuilder.Entity<ListingBoostPurchase>(e =>
            {
                e.ToTable("listing_boost_purchases");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()").ValueGeneratedOnAdd();
                e.Property(x => x.ListingId).HasColumnName("listing_id");
                e.Property(x => x.SellerId).HasColumnName("seller_id");
                e.Property(x => x.PaymentTransactionId).HasColumnName("payment_transaction_id");
                e.Property(x => x.OptionId).HasColumnName("option_id").HasMaxLength(64);
                e.Property(x => x.StartsAt).HasColumnName("starts_at");
                e.Property(x => x.EndsAt).HasColumnName("ends_at");
                e.Property(x => x.IsActive).HasColumnName("is_active");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
                e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
                e.HasIndex(x => x.ListingId);
                e.HasIndex(x => x.PaymentTransactionId).IsUnique();
            });

            modelBuilder.Entity<PlatformFee>(e =>
            {
                e.ToTable("platform_fees");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()").ValueGeneratedOnAdd();
                e.Property(x => x.OrderId).HasColumnName("order_id");
                e.Property(x => x.SellerId).HasColumnName("seller_id");
                e.Property(x => x.BasisAmount).HasColumnName("basis_amount").HasColumnType("numeric(12,2)");
                e.Property(x => x.FeeAmount).HasColumnName("fee_amount").HasColumnType("numeric(12,2)");
                e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(8);
                e.Property(x => x.Rate).HasColumnName("rate").HasColumnType("numeric(8,4)");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
                e.HasIndex(x => x.OrderId).IsUnique();
                e.HasIndex(x => x.SellerId);
            });

            modelBuilder.Entity<SponsoredAd>(e =>
            {
                e.ToTable("sponsored_ads");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()").ValueGeneratedOnAdd();
                e.Property(x => x.Title).HasColumnName("title").HasMaxLength(160);
                e.Property(x => x.Description).HasColumnName("description").HasMaxLength(600);
                e.Property(x => x.ImageUrl).HasColumnName("image_url");
                e.Property(x => x.CtaText).HasColumnName("cta_text").HasMaxLength(80);
                e.Property(x => x.TargetUrl).HasColumnName("target_url");
                e.Property(x => x.IsActive).HasColumnName("is_active");
                e.Property(x => x.StartsAt).HasColumnName("starts_at");
                e.Property(x => x.EndsAt).HasColumnName("ends_at");
                e.Property(x => x.Priority).HasColumnName("priority");
                e.Property(x => x.Impressions).HasColumnName("impressions");
                e.Property(x => x.Clicks).HasColumnName("clicks");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
                e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
                e.Property(x => x.ArchivedAt).HasColumnName("archived_at");
                e.HasIndex(x => new { x.IsActive, x.StartsAt, x.EndsAt, x.Priority });
            });
            
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfiguration(new AddressConfiguration());
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(EfDbContext).Assembly);
            modelBuilder.HasPostgresEnum<ItemCondition>("item_condition");
        }
    }
}
