using Application;
using Domain;
using Microsoft.EntityFrameworkCore.Storage;

namespace Infrastructure;

public class TestRepository : ITestRepository
{
    private readonly DatabaseContext _DbContext;
    public TestRepository(DatabaseContext dbContext)
    {
        _DbContext = dbContext;
        _DbContext.Database.EnsureCreated();
    }
    
    public Test Create(Test test)
    {
        var entity = _DbContext.Add(test);
        _DbContext.SaveChanges();
        return entity.Entity;
    }

    public Test Read(int id)
    {
       
        return _DbContext.Set<Test>().Find(id);
    }
   
    public List<Test> ReadAll()
    {
        return _DbContext.Set<Test>().ToList();
    }

    public Test Update(Test test)
    {
        throw new NotImplementedException();
    }

    public bool Delete(int id)
    {
        _DbContext.Set<Test>().Remove(_DbContext.Find<Test>(id));
        var changedNum = _DbContext.SaveChanges();
        if (changedNum == 0)
        {
            return false;
        }
        return true;
    }

    public bool Delete(Test test)
    {
        throw new NotImplementedException();
    }
}