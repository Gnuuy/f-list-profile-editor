using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure;

public class DatabaseContext : DbContext
{
    
    public DatabaseContext(DbContextOptions<DatabaseContext> options) : base(options){}

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Test>().HasKey(i=>i.Id).HasName("PK_Test");
        modelBuilder.Entity<Test>().Property(i => i.Id).ValueGeneratedOnAdd();
    }
    
    public DbSet<Test> TestsTable { get; set; }
}