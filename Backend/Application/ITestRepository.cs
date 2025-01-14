using Domain;

namespace Application;

public interface ITestRepository
{
    public Test Create(Test test);

    public Test Read(int id);

    public List<Test> ReadAll();
    
    public Test Update(Test test);

    public bool Delete(int id);
    public bool Delete(Test test);

}