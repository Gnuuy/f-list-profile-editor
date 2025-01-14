using Application.DTO.Create;
using Domain;

namespace Application;

public interface ITestService
{
    public Test Test(TestCreateDTO inputTest);
    public List<Test> GetTests();
    public Test GetTestById(int id);
    
    public bool DeleteTestById(int id);
}