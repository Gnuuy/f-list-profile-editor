using Application;
using Domain;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller;
[ApiController]
[Route("[controller]")]
public class TestController : ControllerBase
{
    private readonly ITestService _testService;

    public TestController(ITestService testService)
    {
        _testService = testService;
    }
    
    [HttpGet]
    public Test Test()
    {
       return _testService.Test();
    }
    
    [HttpGet]
    [Route("/")]
    public string Test2()
    {
        return "Kish is very nice for helping me out with this!";
    }
}