using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SBay.Domain.Entities;

namespace SBay.Domain.Database.Configurations;

/// <summary>
/// EF Core configuration for Address entity (snake_case, PostgreSQL style)
/// </summary>
public sealed class AddressConfiguration : IEntityTypeConfiguration<Address>
{
    public void Configure(EntityTypeBuilder<Address> b)
    {
        b.ToTable("addresses");
        
        // Primary Key
        b.HasKey(x => x.Id);
        b.Property(x => x.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()")
            .ValueGeneratedOnAdd();
        
        // Foreign Key
        b.Property(x => x.UserId)
            .HasColumnName("user_id")
            .IsRequired();
        
        // Address fields (match Frontend: Address interface)
        b.Property(x => x.Name)
            .HasColumnName("name")
            .HasMaxLength(100)
            .IsRequired();
        
        b.Property(x => x.Phone)
            .HasColumnName("phone")
            .HasMaxLength(20)
            .IsRequired();
        
        b.Property(x => x.Street)
            .HasColumnName("street")
            .HasMaxLength(200)
            .IsRequired();
        
        b.Property(x => x.City)
            .HasColumnName("city")
            .HasMaxLength(100)
            .IsRequired();
        
        b.Property(x => x.Region)
            .HasColumnName("region")
            .HasMaxLength(100);
        
        // Timestamps
        b.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()");
        
        b.Property(x => x.UpdatedAt)
            .HasColumnName("updated_at");
        
        // Relationships
        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Indexes
        b.HasIndex(x => x.UserId)
            .HasDatabaseName("idx_addresses_user");
    }
}
