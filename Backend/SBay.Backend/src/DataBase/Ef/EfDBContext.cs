using Microsoft.EntityFrameworkCore;
using Message = SBay.Backend.Messaging.Message;
using CartItem = SBay.Domain.Entities.CartItem;
using Listing = SBay.Domain.Entities.Listing;
using Money = SBay.Domain.ValueObjects.Money;
using ShoppingCart = SBay.Domain.Entities.ShoppingCart;
using User = SBay.Domain.Entities.User;
using Category = SBay.Domain.Entities.Category;

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
                e.Property(x => x.Role).HasColumnName("role");
                e.Property(x => x.CreatedAt).HasColumnName("created_at").ValueGeneratedOnAdd();
                e.Property(x => x.LastSeen).HasColumnName("last_seen");
                e.Property(x => x.IsSeller).HasColumnName("is_seller").HasDefaultValue(false);
                e.HasIndex(x => x.Email).IsUnique();
                e.Ignore(x => x.AvatarUrl);
                e.Ignore(x => x.ExternalId);
                e.Ignore(x => x.Rating);
                e.Ignore(x => x.Region);
                e.Ignore(x => x.UserName);
            });
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
            modelBuilder.Entity<Listing>(e =>
            {
                e.ToTable("listings");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id");

                e.Property(x => x.SellerId).HasColumnName("seller_id").IsRequired();
                e.Property(x => x.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
                e.Property(x => x.Description).HasColumnName("description").HasMaxLength(2000);
                e.Property(x => x.CreatedAt).HasColumnName("created_at").ValueGeneratedOnAdd();
                e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
                e.Property(x => x.CategoryPath).HasColumnName("category_path").HasMaxLength(200);
                e.OwnsOne(
                    x => x.Price,
                    m =>
                    {
                        m.Property(mm => mm.Amount)
                            .HasColumnName("price")
                            .HasColumnType("numeric(12,2)");
                        m.Property(mm => mm.Currency).HasColumnName("currency").HasMaxLength(8);
                    }
                );

                e.Ignore(x => x.OriginalPrice);
                e.Ignore(x => x.Condition);
                e.Ignore("RowVersion");

                e.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(x => x.SellerId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasIndex(x => x.SellerId).HasDatabaseName("idx_listings_seller");
            });
            modelBuilder.Entity<Listing>().Property<NpgsqlTypes.NpgsqlTsVector>("SearchVec").HasColumnName("search_vec").HasColumnType("tsvector");

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

            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(EfDbContext).Assembly);
        }
    }
}
