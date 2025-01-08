using Domain;

namespace Application;

public class TestService : ITestService
{
    public Test Test()
    {
        return new Test{TestMessage = "I like wolfgirls."};
    }
}